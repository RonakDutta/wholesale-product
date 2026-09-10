const Razorpay = require("razorpay");
const crypto = require("crypto");
const pool = require("../config/db");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/payment/create-order
 *
 * Creates a Razorpay order for the given app order. The amount is read from the
 * database — never trusted from the client — so a tampered request cannot lower
 * the price.
 */
exports.createRazorpayOrder = async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: "orderId is required" });
  }

  try {
    // Fetch the order and figure out what is owed right now.
    const orderResult = await pool.query(
      `SELECT o.id, o.total_amount, o.payment_status, o.status,
              o.payment_plan, o.amount_paid,
              COALESCE(o.total_amount - o.amount_paid, o.total_amount) AS amount_due
         FROM orders o
        WHERE o.id = $1 AND o.buyer_id = $2`,
      [orderId, req.user.id],
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult.rows[0];

    // Do not accept payment for an order that is cancelled, refunded, etc.
    const blocked = ["cancelled", "refunded", "payment_failed", "return_completed"];
    if (blocked.includes(order.status)) {
      return res
        .status(409)
        .json({ message: "This order is no longer awaiting payment." });
    }

    if (order.payment_status === "paid") {
      return res.status(409).json({ message: "This order is already fully paid." });
    }

    // Work out how much is due for this payment.
    let amountDue = Number(order.amount_due);
    if (order.payment_plan === "installment_50_50" && Number(order.amount_paid) === 0) {
      // First instalment is 50%.
      amountDue = Math.ceil(Number(order.total_amount) / 2);
    }

    // Razorpay expects amount in paise (INR × 100).
    const amountInPaise = Math.round(amountDue * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `order_${orderId}`,
      notes: {
        appOrderId: String(orderId),
        buyerId: String(req.user.id),
      },
    });

    res.status(200).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).json({ message: "Failed to create payment order" });
  }
};

/**
 * POST /api/payment/verify
 *
 * Verifies the Razorpay payment signature, then records the payment against the
 * order — same bookkeeping the existing UPI‑confirm path does.
 */
exports.verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    return res.status(400).json({ message: "Missing required payment fields" });
  }

  try {
    // 1. Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed — signature mismatch" });
    }

    // 2. Fetch order
    const orderResult = await pool.query(
      `SELECT id, total_amount, amount_paid, payment_plan, payment_status, status, seller_id
         FROM orders
        WHERE id = $1 AND buyer_id = $2`,
      [orderId, req.user.id],
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult.rows[0];

    // Guard against double‑payment on an already‑settled order.
    const blocked = ["cancelled", "refunded", "payment_failed", "return_completed"];
    if (blocked.includes(order.status)) {
      return res.status(409).json({ message: "This order is no longer awaiting payment." });
    }

    // 3. Fetch the Razorpay order to confirm the exact amount charged.
    const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
    const paidAmount = Number(rzpOrder.amount) / 100; // paise → rupees

    // 4. Record in payment_transactions
    await pool.query(
      `INSERT INTO payment_transactions
         (order_id, amount, payment_method, transaction_id, status, gateway_response)
       VALUES ($1, $2, 'razorpay', $3, 'completed', $4)`,
      [
        orderId,
        paidAmount,
        razorpay_payment_id,
        JSON.stringify({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        }),
      ],
    );

    // 5. Update order
    const newAmountPaid = Number(order.amount_paid) + paidAmount;
    const fullyPaid = newAmountPaid >= Number(order.total_amount);

    await pool.query(
      `UPDATE orders
          SET amount_paid     = $1,
              payment_status  = $2,
              status          = CASE
                                  WHEN status = 'payment_pending' THEN 'confirmed'
                                  ELSE status
                                END,
              updated_at      = NOW()
        WHERE id = $3`,
      [
        newAmountPaid,
        fullyPaid ? "paid" : "partially_paid",
        orderId,
      ],
    );

    // 6. Record in order_status_history
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, notes)
       VALUES ($1, $2, $3)`,
      [
        orderId,
        fullyPaid ? "confirmed" : "partially_paid",
        `Razorpay payment of ₹${paidAmount.toLocaleString("en-IN")} received. Transaction: ${razorpay_payment_id}`,
      ],
    );

    res.status(200).json({
      success: true,
      message: fullyPaid
        ? "Payment verified and order confirmed!"
        : `Payment of ₹${paidAmount.toLocaleString("en-IN")} recorded. Remaining balance due.`,
      fullyPaid,
      amountPaid: newAmountPaid,
      remainingAmount: Math.max(Number(order.total_amount) - newAmountPaid, 0),
    });
  } catch (err) {
    console.error("Razorpay verify error:", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
};
