const pool = require("../config/db");
const { validateStatusTransition, mapPaymentStatusToOrderStatus, getOrderTimeline, recordStatusChange } = require("../services/orderStatusService");
const PDFDocument = require("pdfkit");

const ensureOrderAccess = async (req, res, orderId, { requireBuyer = true, requireSupplier = true } = {}) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized: Missing user credentials." });
    return null;
  }

  const role = req.user?.role || "buyer";
  if (role === "admin") {
    return { authorized: true };
  }

  const orderResult = await pool.query(
    "SELECT buyer_id, supplier_id FROM orders WHERE id = $1",
    [orderId],
  );

  if (orderResult.rows.length === 0) {
    res.status(404).json({ success: false, message: "Order not found" });
    return null;
  }

  const order = orderResult.rows[0];
  const isBuyer = order.buyer_id === userId;
  const isSupplier = order.supplier_id === userId;

  if (role === "buyer") {
    if (requireBuyer && isBuyer) {
      return { authorized: true, order };
    }
    res.status(403).json({ success: false, message: "Access Denied: Unauthorized access verification layer." });
    return null;
  }

  if (role === "seller" || role === "both") {
    if (requireBuyer && isBuyer) {
      return { authorized: true, order };
    }
    if (requireSupplier && isSupplier) {
      return { authorized: true, order };
    }
  }

  res.status(403).json({ success: false, message: "Access Denied: Unauthorized access verification layer." });
  return null;
};

const getSupplierOrders = async (req, res) => {
  const supplierId = req.user.id;

  try {
    const query = `
      SELECT 
        o.id,
        o.order_number,
        COALESCE(wp.company_name, u.first_name || ' ' || u.last_name) as buyer,
        u.first_name || ' ' || u.last_name as contact,
        p.name as product,
        o.quantity as qty,
        o.total_amount as amount,
        o.status,
        o.payment_status,
        o.created_at as date
      FROM orders o
      JOIN supplier_inventory si ON o.inventory_item_id = si.id
      JOIN products p ON si.product_id = p.id
      JOIN users u ON o.buyer_id = u.id
      LEFT JOIN wholesaler_profiles wp ON u.id = wp.user_id
      WHERE si.supplier_id = $1
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query, [supplierId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching supplier orders:", err);
    res.status(500).json({ message: "Server error fetching orders" });
  }
};

const getBuyerOrders = async (req, res) => {
  const buyerId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT o.id, o.order_number, o.status, o.payment_status, o.total_amount, o.created_at,
              p.name as product, u.first_name || ' ' || u.last_name as supplier_name
       FROM orders o
       JOIN supplier_inventory si ON o.inventory_item_id = si.id
       JOIN products p ON si.product_id = p.id
       JOIN users u ON si.supplier_id = u.id
       WHERE o.buyer_id = $1
       ORDER BY o.created_at DESC`,
      [buyerId],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching buyer orders:", error);
    res.status(500).json({ message: "Server error fetching buyer orders" });
  }
};

const createOrder = async (req, res) => {
  const { products, deliveryAddress, totalAmount, billingAddress, paymentMethod = "upi" } = req.body;
  const buyerId = req.user?.id;

  if (!buyerId) {
    return res.status(401).json({ success: false, message: "Unauthorized: Missing user credentials." });
  }

  if (!products || products.length === 0 || !deliveryAddress || !totalAmount) {
    return res.status(400).json({ success: false, message: "Missing required order checkout fields." });
  }

  const targetItem = products[0];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ids are UUIDs; keep them as strings (strip any "#..." suffix the client may append)
    const cleanProductId = String(targetItem.productId || "").split("#")[0].trim();
    const rawSupplierId = targetItem.supplierId || targetItem.vendorId;
    const cleanSupplierId = rawSupplierId ? String(rawSupplierId).split("#")[0].trim() : null;

    if (!cleanProductId) {
      throw new Error("Invalid product ID format.");
    }

    // Only constrain by supplier when we actually have one, so we never pass
    // an invalid value into a UUID column.
    let inventoryQuery = { rows: [] };
    if (cleanSupplierId) {
      inventoryQuery = await client.query(
        "SELECT id, supplier_id, stock, moq, price FROM supplier_inventory WHERE product_id = $1 AND supplier_id = $2 AND status = 'Active' LIMIT 1",
        [cleanProductId, cleanSupplierId],
      );
    }

    if (inventoryQuery.rows.length === 0) {
      inventoryQuery = await client.query(
        "SELECT id, supplier_id, stock, moq, price FROM supplier_inventory WHERE product_id = $1 AND status = 'Active' LIMIT 1",
        [cleanProductId],
      );
    }

    if (inventoryQuery.rows.length === 0) {
      throw new Error("Specified supplier product not found in active inventory catalogs.");
    }

    const inventoryItem = inventoryQuery.rows[0];
    const cleanQuantity = parseInt(targetItem.quantity, 10) || 1;
    const cleanTotal = parseFloat(totalAmount);

    if (cleanQuantity < inventoryItem.moq) {
      throw new Error(`Quantity must meet MOQ of ${inventoryItem.moq}`);
    }

    if (inventoryItem.stock < cleanQuantity) {
      throw new Error("Insufficient stock for requested quantity");
    }

    if (inventoryItem.supplier_id === buyerId) {
      throw new Error("Supplier cannot order their own inventory");
    }

    const orderResult = await client.query(
      `INSERT INTO orders (
        buyer_id,
        supplier_id,
        inventory_item_id,
        quantity,
        total_amount,
        subtotal,
        status,
        payment_status,
        delivery_address,
        billing_address,
        contact_phone,
        notes,
        order_number,
        expected_delivery_date,
        updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP) RETURNING id`,
      [
        buyerId,
        inventoryItem.supplier_id,
        inventoryItem.id,
        cleanQuantity,
        cleanTotal,
        cleanTotal,
        "payment_pending",
        "pending",
        JSON.stringify(deliveryAddress),
        JSON.stringify(billingAddress || deliveryAddress),
        String(deliveryAddress.phone || ""),
        "Order created via enterprise checkout",
        `ORD-${Date.now()}-${buyerId}`,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      ],
    );

    const orderId = orderResult.rows[0].id;

    await client.query(
      `UPDATE supplier_inventory SET stock = stock - $1 WHERE id = $2`,
      [cleanQuantity, inventoryItem.id],
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, status, previous_status, updated_by, updated_by_role, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, "payment_pending", null, buyerId, "buyer", "Order created"],
    );

    await client.query(
      `INSERT INTO payment_transactions (order_id, amount, payment_method, payment_status, gateway_response)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, cleanTotal, paymentMethod, "pending", JSON.stringify({ method: paymentMethod })],
    );

    await client.query("COMMIT");
    return res.status(201).json({ success: true, orderId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("CRITICAL DATABASE REJECTION:", error);
    return res.status(400).json({ success: false, message: error.message || "Database Error" });
  } finally {
    client.release();
  }
};

const getPaymentDetails = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    const orderQuery = await pool.query(
      `SELECT o.id, o.total_amount, o.buyer_id, o.supplier_id, o.delivery_address, si.product_id,
              p.name as product_name, wp.company_name, wp.upi_id, o.order_number, o.payment_status, o.status
       FROM orders o
       JOIN supplier_inventory si ON o.inventory_item_id = si.id
       JOIN products p ON si.product_id = p.id
       JOIN wholesaler_profiles wp ON si.supplier_id = wp.user_id
       WHERE o.id = $1`,
      [orderId],
    );

    if (orderQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order records not found." });
    }

    const orderRecord = orderQuery.rows[0];
    const isBuyer = orderRecord.buyer_id === userId;
    const isSupplier = orderRecord.supplier_id === userId;

    if (req.user.role !== "admin" && !isBuyer && !isSupplier) {
      return res.status(403).json({ success: false, message: "Access Denied: Unauthorized access verification layer." });
    }

    res.json({
      success: true,
      orderId: orderRecord.id,
      orderNumber: orderRecord.order_number,
      amount: orderRecord.total_amount,
      supplierName: orderRecord.company_name || "Wholesale Merchant",
      supplierUpiId: orderRecord.upi_id,
      productName: orderRecord.product_name,
      deliveryAddress: orderRecord.delivery_address,
      paymentStatus: orderRecord.payment_status,
      status: orderRecord.status,
    });
  } catch (error) {
    console.error("Error processing dynamic payment extraction routing:", error);
    res.status(500).json({ success: false, message: "Internal server query resolution failure." });
  }
};

const updatePaymentStatus = async (req, res) => {
  const { orderId } = req.params;
  const { paymentStatus, paymentMethod = "upi", remarks } = req.body;
  const userId = req.user.id;

  if (!["paid", "failed", "pending", "partial", "cod"].includes(paymentStatus)) {
    return res.status(400).json({ success: false, message: "Invalid payload argument tracking variables." });
  }

  const client = await pool.connect();
  try {
    const accessCheck = await ensureOrderAccess(req, res, orderId, { requireBuyer: true, requireSupplier: false });
    if (!accessCheck) return;

    await client.query("BEGIN");
    const checkOrder = await client.query("SELECT buyer_id, status FROM orders WHERE id = $1", [orderId]);
    if (checkOrder.rows.length === 0) {
      throw new Error("Order metadata mapping context missing.");
    }
    if (checkOrder.rows[0].buyer_id !== userId) {
      throw new Error("Unauthorized credentials check state.");
    }

    const previousStatus = checkOrder.rows[0].status;
    const nextOrderStatus = mapPaymentStatusToOrderStatus(paymentStatus);
    const validation = validateStatusTransition(previousStatus, nextOrderStatus);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    await client.query(
      `UPDATE orders SET payment_status = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [paymentStatus, nextOrderStatus, orderId],
    );

    await client.query(
      `INSERT INTO payment_transactions (order_id, amount, payment_method, payment_status, gateway_response, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [orderId, 0, paymentMethod, paymentStatus === "paid" ? "completed" : "pending", JSON.stringify({ method: paymentMethod })],
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, status, previous_status, updated_by, updated_by_role, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, nextOrderStatus, previousStatus, userId, req.user.role || "buyer", remarks || `Payment marked as ${paymentStatus}`],
    );

    await client.query("COMMIT");
    res.json({ success: true, message: `Payment state mapped successfully to active parameter: ${paymentStatus}.` });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating transaction records pipeline:", error);
    res.status(400).json({ success: false, message: error.message || "Internal server state error processing updates." });
  } finally {
    client.release();
  }
};

const getOrderById = async (req, res) => {
  try {
    const accessCheck = await ensureOrderAccess(req, res, req.params.orderId, { requireBuyer: true, requireSupplier: true });
    if (!accessCheck) return;

    const result = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.orderId]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status, remarks } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role || "buyer";

  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required" });
  }

  try {
    const accessCheck = await ensureOrderAccess(req, res, orderId, { requireBuyer: false, requireSupplier: true });
    if (!accessCheck) return;

    const orderLookup = await pool.query("SELECT status FROM orders WHERE id = $1", [orderId]);
    if (orderLookup.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const previousStatus = orderLookup.rows[0].status;
    const validation = validateStatusTransition(previousStatus, status);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    await pool.query(
      `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, orderId],
    );

    await recordStatusChange(orderId, status, previousStatus, userId, userRole, remarks || `Status updated to ${status}`);
    res.json({ success: true, message: "Order status updated" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update status" });
  }
};

const getOrderTimelineHandler = async (req, res) => {
  try {
    const accessCheck = await ensureOrderAccess(req, res, req.params.orderId, { requireBuyer: true, requireSupplier: true });
    if (!accessCheck) return;

    const timeline = await getOrderTimeline(req.params.orderId);
    res.json({ success: true, timeline });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({ success: false, message: "Failed to load timeline" });
  }
};

const requestReturn = async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  try {
    const accessCheck = await ensureOrderAccess(req, res, orderId, { requireBuyer: true, requireSupplier: false });
    if (!accessCheck) return;

    await pool.query(
      `UPDATE orders SET return_status = 'requested', return_requested_at = CURRENT_TIMESTAMP, notes = COALESCE(notes, '') || ' Return requested' WHERE id = $1 AND buyer_id = $2`,
      [orderId, req.user.id],
    );
    res.json({ success: true, message: "Return requested" });
  } catch (error) {
    console.error("Error requesting return:", error);
    res.status(500).json({ success: false, message: "Failed to request return" });
  }
};

const generateInvoice = async (req, res) => {
  try {
    const accessCheck = await ensureOrderAccess(req, res, req.params.orderId, { requireBuyer: true, requireSupplier: true });
    if (!accessCheck) return;

    const { rows } = await pool.query(
      `SELECT o.*, p.name as product_name, u.first_name || ' ' || u.last_name as buyer_name, su.first_name || ' ' || su.last_name as supplier_name
       FROM orders o
       JOIN supplier_inventory si ON o.inventory_item_id = si.id
       JOIN products p ON si.product_id = p.id
       JOIN users u ON o.buyer_id = u.id
       JOIN users su ON si.supplier_id = su.id
       WHERE o.id = $1`,
      [req.params.orderId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const order = rows[0];
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.id}.pdf`);
    doc.pipe(res);
    doc.fontSize(18).text("Wholesale Marketplace Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice #: INV-${order.id}`);
    doc.text(`Order #: ${order.order_number || order.id}`);
    doc.text(`Buyer: ${order.buyer_name}`);
    doc.text(`Supplier: ${order.supplier_name}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Total: ₹${Number(order.total_amount || 0).toFixed(2)}`);
    doc.end();
  } catch (error) {
    console.error("Invoice generation error:", error);
    res.status(500).json({ success: false, message: "Failed to generate invoice" });
  }
};

const generatePackingSlip = async (req, res) => {
  try {
    const accessCheck = await ensureOrderAccess(req, res, req.params.orderId, { requireBuyer: true, requireSupplier: true });
    if (!accessCheck) return;

    const { rows } = await pool.query(
      `SELECT o.*, p.name as product_name, p.category, u.first_name || ' ' || u.last_name as buyer_name, su.first_name || ' ' || su.last_name as supplier_name
       FROM orders o
       JOIN supplier_inventory si ON o.inventory_item_id = si.id
       JOIN products p ON si.product_id = p.id
       JOIN users u ON o.buyer_id = u.id
       JOIN users su ON si.supplier_id = su.id
       WHERE o.id = $1`,
      [req.params.orderId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const order = rows[0];
    res.json({ success: true, packingSlip: { orderId: order.id, supplierName: order.supplier_name, buyerName: order.buyer_name, productName: order.product_name, category: order.category, quantity: order.quantity, status: order.status } });
  } catch (error) {
    console.error("Packing slip error:", error);
    res.status(500).json({ success: false, message: "Failed to generate packing slip" });
  }
};

module.exports = {
  createOrder,
  getPaymentDetails,
  updatePaymentStatus,
  getOrderById,
  getSupplierOrders,
  getBuyerOrders,
  updateOrderStatus,
  getOrderTimelineHandler,
  requestReturn,
  generateInvoice,
  generatePackingSlip,
};