const pool = require("../config/db");
const { validateStatusTransition, mapPaymentStatusToOrderStatus, getOrderTimeline, recordStatusChange } = require("../services/orderStatusService");
const PDFDocument = require("pdfkit");
const { geocodeOrderDestination } = require("../services/geocodingService");
const invoiceService = require("../services/invoiceService");

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
        COALESCE(items.first_product, p.name) as product,
        COALESCE(items.item_count, 1) as item_count,
        o.quantity as qty,
        o.total_amount as amount,
        o.status,
        o.payment_status,
        o.created_at as date
      FROM orders o
      LEFT JOIN supplier_inventory si ON o.inventory_item_id = si.id
      LEFT JOIN products p ON si.product_id = p.id
      JOIN users u ON o.buyer_id = u.id
      LEFT JOIN wholesaler_profiles wp ON u.id = wp.user_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS item_count, MIN(oi.product_name) AS first_product
        FROM order_items oi WHERE oi.order_id = o.id
      ) items ON TRUE
      WHERE o.supplier_id = $1 OR si.supplier_id = $1
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
    // An order can hold several products from one wholesaler, so describe it
    // by its lines rather than naming whichever product happened to be first.
    const result = await pool.query(
      `SELECT o.id, o.order_number, o.status, o.payment_status,
              o.total_amount, o.created_at, o.quantity,
              COALESCE(wp.company_name, u.first_name || ' ' || u.last_name) AS supplier_name,
              COALESCE(items.item_count, 1) AS item_count,
              COALESCE(items.first_product, p.name) AS product,
              COALESCE(items.image, si.image_url, p.global_image_url) AS image
       FROM orders o
       LEFT JOIN supplier_inventory si ON o.inventory_item_id = si.id
       LEFT JOIN products p ON si.product_id = p.id
       LEFT JOIN users u ON u.id = o.supplier_id
       LEFT JOIN wholesaler_profiles wp ON wp.user_id = o.supplier_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS item_count,
                MIN(oi.product_name) AS first_product,
                MIN(COALESCE(isi.image_url, ip.global_image_url)) AS image
         FROM order_items oi
         LEFT JOIN supplier_inventory isi ON isi.id = oi.inventory_item_id
         LEFT JOIN products ip ON ip.id = oi.product_id
         WHERE oi.order_id = o.id
       ) items ON TRUE
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
  const { products, deliveryAddress, billingAddress, paymentMethod = "upi" } = req.body;
  const buyerId = req.user?.id;

  if (!buyerId) {
    return res.status(401).json({ success: false, message: "Unauthorized: Missing user credentials." });
  }

  if (!Array.isArray(products) || products.length === 0 || !deliveryAddress) {
    return res.status(400).json({ success: false, message: "Missing required order checkout fields." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Resolve every requested line against live inventory. Prices, MOQ and
    // stock all come from the database - amounts sent by the client are
    // ignored, otherwise a crafted request could set its own price.
    const lines = [];
    for (const entry of products) {
      const productId = String(entry.productId || "").split("#")[0].trim();
      const inventoryId = entry.inventoryId
        ? String(entry.inventoryId).split("#")[0].trim()
        : null;
      const quantity = parseInt(entry.quantity, 10) || 0;

      if (!productId) throw new Error("Invalid product reference in order.");
      if (quantity <= 0) throw new Error("Every item needs a quantity of at least 1.");

      // Prefer the exact listing the buyer chose; fall back to any active
      // listing of that product.
      let lookup = { rows: [] };
      if (inventoryId) {
        lookup = await client.query(
          `SELECT si.id, si.supplier_id, si.product_id, si.stock, si.moq,
                  si.price, si.discount_price, si.shipping_days, p.name AS product_name
           FROM supplier_inventory si
           JOIN products p ON p.id = si.product_id
           WHERE si.id = $1 AND si.status = 'Active'`,
          [inventoryId],
        );
      }
      if (lookup.rows.length === 0) {
        lookup = await client.query(
          `SELECT si.id, si.supplier_id, si.product_id, si.stock, si.moq,
                  si.price, si.discount_price, si.shipping_days, p.name AS product_name
           FROM supplier_inventory si
           JOIN products p ON p.id = si.product_id
           WHERE si.product_id = $1 AND si.status = 'Active'
           ORDER BY si.price ASC
           LIMIT 1`,
          [productId],
        );
      }
      if (lookup.rows.length === 0) {
        throw new Error("A product in your order is no longer available.");
      }

      const inv = lookup.rows[0];

      if (String(inv.supplier_id) === String(buyerId)) {
        throw new Error("You cannot order your own inventory.");
      }
      if (quantity < inv.moq) {
        throw new Error(`${inv.product_name} has a minimum order quantity of ${inv.moq}.`);
      }
      if (inv.stock < quantity) {
        throw new Error(`${inv.product_name} only has ${inv.stock} left in stock.`);
      }

      // Bulk price applies once the MOQ threshold is met.
      const unitPrice = Number(
        inv.discount_price && quantity >= inv.moq ? inv.discount_price : inv.price,
      );

      lines.push({
        inventoryId: inv.id,
        productId: inv.product_id,
        supplierId: inv.supplier_id,
        productName: inv.product_name,
        quantity,
        unitPrice,
        listPrice: Number(inv.price),
        discountPrice: inv.discount_price ? Number(inv.discount_price) : null,
        moq: inv.moq,
        shippingDays: inv.shipping_days,
        lineTotal: Number((unitPrice * quantity).toFixed(2)),
      });
    }

    // One order ships from one wholesaler on one truck.
    const supplierIds = new Set(lines.map((l) => String(l.supplierId)));
    if (supplierIds.size > 1) {
      throw new Error("An order can only contain items from a single wholesaler.");
    }

    const supplierId = lines[0].supplierId;
    const subtotal = Number(lines.reduce((sum, l) => sum + l.lineTotal, 0).toFixed(2));
    const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
    const maxShippingDays = Math.max(...lines.map((l) => Number(l.shippingDays) || 7));

    const orderResult = await client.query(
      `INSERT INTO orders (
        buyer_id, supplier_id, inventory_item_id, quantity,
        total_amount, subtotal, status, payment_status,
        delivery_address, billing_address, contact_phone, notes,
        order_number, expected_delivery_date, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
       RETURNING id`,
      [
        buyerId,
        supplierId,
        // kept for backwards compatibility with single-item readers
        lines[0].inventoryId,
        totalQuantity,
        subtotal,
        subtotal,
        "payment_pending",
        "pending",
        JSON.stringify(deliveryAddress),
        JSON.stringify(billingAddress || deliveryAddress),
        String(deliveryAddress.phone || ""),
        `Order with ${lines.length} item${lines.length === 1 ? "" : "s"}`,
        // order_number is VARCHAR(50): a full UUID suffix overflows it
        `ORD-${Date.now()}-${String(buyerId).slice(0, 8)}`,
        new Date(Date.now() + maxShippingDays * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      ],
    );

    const orderId = orderResult.rows[0].id;

    for (const line of lines) {
      await client.query(
        `INSERT INTO order_items (
           order_id, inventory_item_id, product_id, supplier_id, product_name,
           quantity, unit_price, discount_price, total_price, moq, shipping_days, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          orderId,
          line.inventoryId,
          line.productId,
          line.supplierId,
          line.productName,
          line.quantity,
          line.listPrice,
          line.discountPrice,
          line.lineTotal,
          line.moq,
          line.shippingDays,
          "pending",
        ],
      );

      // Guarded so two concurrent checkouts cannot oversell the same listing.
      const stockUpdate = await client.query(
        `UPDATE supplier_inventory
         SET stock = stock - $1
         WHERE id = $2 AND stock >= $1
         RETURNING id`,
        [line.quantity, line.inventoryId],
      );
      if (stockUpdate.rows.length === 0) {
        throw new Error(`${line.productName} went out of stock while checking out.`);
      }
    }

    await client.query(
      `INSERT INTO order_status_history (order_id, status, previous_status, updated_by, updated_by_role, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, "payment_pending", null, buyerId, "buyer", "Order created"],
    );

    await client.query(
      `INSERT INTO payment_transactions (order_id, amount, payment_method, payment_status, gateway_response)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, subtotal, paymentMethod, "pending", JSON.stringify({ method: paymentMethod })],
    );

    await client.query("COMMIT");

    // A pin dropped at checkout is authoritative - only fall back to
    // geocoding the typed address when the buyer did not place one. Geocoding
    // is rate limited, so it is never awaited: it must not delay checkout,
    // and the map degrades gracefully until it lands.
    const pinnedLat = Number(deliveryAddress?.lat);
    const pinnedLng = Number(deliveryAddress?.lng);
    if (Number.isFinite(pinnedLat) && Number.isFinite(pinnedLng)) {
      pool
        .query("UPDATE orders SET delivery_lat = $1, delivery_lng = $2 WHERE id = $3", [
          pinnedLat,
          pinnedLng,
          orderId,
        ])
        .catch(() => { });
    } else {
      geocodeOrderDestination(orderId, deliveryAddress).catch(() => { });
    }

    // Trigger automatic invoice creation in background
    invoiceService.createInvoiceFromOrder(orderId).catch((invErr) => {
      console.warn("Background invoice creation notice:", invErr.message);
    });

    return res.status(201).json({ success: true, orderId, subtotal, itemCount: lines.length });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Order creation failed:", error);
    return res.status(400).json({ success: false, message: error.message || "Could not create order" });
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
    const checkOrder = await client.query("SELECT buyer_id, status, total_amount FROM orders WHERE id = $1", [orderId]);
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

    // Stock is deducted when the order is created. If payment never completes,
    // hand it back, otherwise abandoned checkouts silently consume inventory.
    // The lifecycle makes payment_failed terminal, so this cannot double-run.
    if (nextOrderStatus === "payment_failed") {
      await client.query(
        `UPDATE supplier_inventory si
         SET stock = si.stock + o.quantity
         FROM orders o
         WHERE o.id = $1 AND si.id = o.inventory_item_id`,
        [orderId],
      );
    }

    // Record the order's actual value. This was hardcoded to 0, which both
    // misrepresented the payment and violated the amount > 0 check constraint.
    const transactionAmount = Number(checkOrder.rows[0].total_amount) || 0;

    await client.query(
      `INSERT INTO payment_transactions (order_id, amount, payment_method, payment_status, gateway_response, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [orderId, transactionAmount, paymentMethod, paymentStatus === "paid" ? "completed" : "pending", JSON.stringify({ method: paymentMethod })],
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, status, previous_status, updated_by, updated_by_role, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, nextOrderStatus, previousStatus, userId, req.user.role || "buyer", remarks || `Payment marked as ${paymentStatus}`],
    );

    await client.query("COMMIT");

    // Automatically trigger invoice generation & PDF dispatch if payment is marked paid
    if (paymentStatus === "paid") {
      invoiceService.createInvoiceFromOrder(orderId).catch((invErr) => {
        console.warn("Background invoice creation notice:", invErr.message);
      });
    }

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

    // Include what was actually ordered - the detail page needs the product,
    // its image and the supplier, not just the raw order row.
    const result = await pool.query(
      `SELECT
         o.*,
         p.id            AS product_id,
         p.name          AS product_name,
         p.category      AS product_category,
         COALESCE(si.image_url, p.global_image_url) AS product_image,
         si.price        AS unit_price,
         si.discount_price AS unit_discount_price,
         si.moq,
         si.shipping_days,
         su.id           AS supplier_user_id,
         COALESCE(wp.company_name, su.first_name || ' ' || su.last_name) AS supplier_name,
         wp.city         AS supplier_city,
         wp.country      AS supplier_country,
         wp.contact_phone AS supplier_phone,
         bu.first_name || ' ' || bu.last_name AS buyer_name
       FROM orders o
       LEFT JOIN supplier_inventory si ON o.inventory_item_id = si.id
       LEFT JOIN products p ON si.product_id = p.id
       LEFT JOIN users su ON si.supplier_id = su.id
       LEFT JOIN wholesaler_profiles wp ON wp.user_id = su.id
       LEFT JOIN users bu ON o.buyer_id = bu.id
       WHERE o.id = $1`,
      [req.params.orderId],
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });

    // Line items for multi-product orders. Older single-item orders have no
    // rows here, so the caller falls back to the flattened product columns.
    const itemsResult = await pool.query(
      `SELECT oi.id, oi.product_id, oi.product_name, oi.quantity,
              oi.unit_price, oi.discount_price, oi.total_price, oi.moq,
              oi.shipping_days,
              COALESCE(si.image_url, p.global_image_url) AS image,
              p.category
       FROM order_items oi
       LEFT JOIN supplier_inventory si ON si.id = oi.inventory_item_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at ASC`,
      [req.params.orderId],
    );

    res.json({ ...result.rows[0], items: itemsResult.rows });
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