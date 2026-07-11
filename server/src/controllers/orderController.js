const pool = require("../config/db");

// 1. Create a single-item order entry matching your inventory schema architecture
const createOrder = async (req, res) => {
  const { products, deliveryAddress, totalAmount } = req.body;
  const buyerId = req.user?.id;

  if (!buyerId) {
    return res.status(401).json({ success: false, message: "Unauthorized: Missing user credentials." });
  }

  if (!products || products.length === 0 || !deliveryAddress || !totalAmount) {
    return res.status(400).json({ success: false, message: "Missing required order checkout fields." });
  }

  const targetItem = products[0];

  try {
    const cleanProductId = parseInt(String(targetItem.productId).split('#')[0], 10);
    const cleanSupplierId = parseInt(String(targetItem.supplierId || targetItem.vendorId).split('#')[0], 10);

    if (isNaN(cleanProductId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID format." });
    }

    let inventoryQuery = await pool.query(
      "SELECT id FROM supplier_inventory WHERE product_id = $1 AND supplier_id = $2 LIMIT 1",
      [cleanProductId, cleanSupplierId]
    );

    if (inventoryQuery.rows.length === 0) {
      inventoryQuery = await pool.query(
        "SELECT id FROM supplier_inventory WHERE product_id = $1 LIMIT 1",
        [cleanProductId]
      );
    }

    if (inventoryQuery.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Specified supplier product not found in active inventory catalogs." 
      });
    }

    const inventoryItemId = inventoryQuery.rows[0].id;
    const cleanQuantity = parseInt(targetItem.quantity, 10) || 1;
    const cleanTotal = parseFloat(totalAmount);

    const orderResult = await pool.query(
      `INSERT INTO orders (
        buyer_id, 
        inventory_item_id, 
        quantity, 
        total_amount, 
        status, 
        payment_status, 
        delivery_address, 
        contact_phone
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        buyerId,
        inventoryItemId,
        cleanQuantity,
        cleanTotal,
        'pending',
        'pending',
        JSON.stringify(deliveryAddress),
        String(deliveryAddress.phone || '')
      ]
    );

    return res.status(201).json({ success: true, orderId: orderResult.rows[0].id });
  } catch (error) {
    console.error("CRITICAL DATABASE REJECTION:", error);
    
    // This passes the exact database error back to the client toast
    return res.status(500).json({ 
      success: false, 
      message: `Database Error: ${error.message}`
    });
  }
};

// 2. Fetch Supplier UPI details relationally using structural JOINS
const getPaymentDetails = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    const orderQuery = await pool.query(
      `SELECT o.id, o.total_amount, o.buyer_id, o.delivery_address, si.product_id, 
              p.name as product_name, wp.company_name, wp.upi_id
       FROM orders o
       JOIN supplier_inventory si ON o.inventory_item_id = si.id
       JOIN products p ON si.product_id = p.id
       JOIN wholesaler_profiles wp ON si.supplier_id = wp.user_id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order records not found." });
    }

    const orderRecord = orderQuery.rows[0];

    // Security Gate check ensuring user ownership boundaries
    if (orderRecord.buyer_id !== userId) {
      return res.status(403).json({ success: false, message: "Access Denied: Unauthorized access verification layer." });
    }

    res.json({
      success: true,
      orderId: orderRecord.id,
      amount: orderRecord.total_amount,
      supplierName: orderRecord.company_name || "Wholesale Merchant",
      supplierUpiId: orderRecord.upi_id,
      productName: orderRecord.product_name,
      deliveryAddress: orderRecord.delivery_address
    });
  } catch (error) {
    console.error("Error processing dynamic payment extraction routing:", error);
    res.status(500).json({ success: false, message: "Internal server query resolution failure." });
  }
};

// 3. Mark Settlement Completed Update Mapping States
const updatePaymentStatus = async (req, res) => {
  const { orderId } = req.params;
  const { paymentStatus } = req.body;
  const userId = req.user.id;

  if (!["paid", "failed", "pending"].includes(paymentStatus)) {
    return res.status(400).json({ success: false, message: "Invalid payload argument tracking variables." });
  }

  try {
    const checkOrder = await pool.query("SELECT buyer_id FROM orders WHERE id = $1", [orderId]);
    if (checkOrder.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order metadata mapping context missing." });
    }
    if (checkOrder.rows[0].buyer_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized credentials check state." });
    }

    const nextOrderStatus = paymentStatus === "paid" ? "confirmed" : "pending";

    await pool.query(
      "UPDATE orders SET payment_status = $1, status = $2 WHERE id = $3",
      [paymentStatus, nextOrderStatus, orderId]
    );

    res.json({ success: true, message: `Payment state mapped successfully to active parameter: ${paymentStatus}.` });
  } catch (error) {
    console.error("Error updating transaction records pipeline:", error);
    res.status(500).json({ success: false, message: "Internal server state error processing updates." });
  }
};

const getOrderById = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders WHERE id = $1", [req.params.orderId]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createOrder,
  getPaymentDetails,
  updatePaymentStatus,
  getOrderById
};