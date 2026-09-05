const pool = require("../config/db");
const {
  enqueueNotification,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
} = require("./notificationManager");
const {
  DEFAULT_LOW_STOCK_THRESHOLD,
  calculateStockSeverity,
  isLowStock,
  formatStockAlertMessage,
} = require("../utils/stockAlertUtils");

/**
 * Checks stock level for an inventory item and triggers automated email and in-app alerts if low.
 */
const checkAndTriggerLowStockAlert = async ({
  inventoryId,
  supplierId = null,
  currentStock = null,
  previousStock = null,
  client = pool,
}) => {
  if (!inventoryId) return { triggered: false, reason: "Missing inventory ID" };

  try {
    const query = `
      SELECT si.id, si.stock, si.moq, si.supplier_id, si.status,
             p.name AS product_name, p.category,
             u.email AS supplier_email, u.name AS supplier_name,
             sp.company_name
      FROM supplier_inventory si
      JOIN products p ON si.product_id = p.id
      JOIN users u ON si.supplier_id = u.id
      LEFT JOIN seller_profiles sp ON si.supplier_id = sp.user_id
      WHERE si.id = $1
    `;
    const { rows } = await client.query(query, [inventoryId]);
    if (rows.length === 0) {
      return { triggered: false, reason: "Inventory item not found" };
    }

    const item = rows[0];
    const stock = currentStock !== null ? Number(currentStock) : Number(item.stock);
    const itemData = { ...item, stock };

    if (!isLowStock(itemData)) {
      return { triggered: false, reason: "Stock is above low threshold", stock };
    }

    const alertDetails = formatStockAlertMessage(itemData);
    const targetUserId = supplierId || item.supplier_id;
    const targetEmail = item.supplier_email;
    const displayName = item.company_name || item.supplier_name || "Wholesaler";

    // Dispatch automated notification via NotificationManager (In-App + Email)
    const notification = await enqueueNotification({
      userId: targetUserId,
      title: alertDetails.title,
      message: alertDetails.message,
      notificationType: NOTIFICATION_TYPES.inventory,
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL],
      priority: alertDetails.severity === "out_of_stock" ? "high" : "normal",
      referenceId: inventoryId,
      referenceType: "inventory",
      emailPayload: {
        to: targetEmail,
        subject: alertDetails.title,
        templateName: "low_stock_alert",
        variables: {
          productName: alertDetails.productName,
          stockLeft: alertDetails.stockLeft,
          moq: alertDetails.moq,
          supplierName: displayName,
          severity: alertDetails.severity,
          category: alertDetails.category,
          message: alertDetails.message,
          restockUrl: "/seller/products",
        },
      },
    });

    return {
      triggered: true,
      alertDetails,
      notification,
    };
  } catch (error) {
    console.error(`[StockAlert] Failed to trigger alert for inventory ${inventoryId}:`, error.message);
    return { triggered: false, error: error.message };
  }
};

/**
 * Scans active inventory to find low stock products and optionally triggers automated alerts.
 */
const scanLowStockInventory = async ({
  supplierId = null,
  threshold = DEFAULT_LOW_STOCK_THRESHOLD,
  autoNotify = false,
  client = pool,
} = {}) => {
  let query = `
    SELECT si.id, si.stock, si.moq, si.price, si.status, si.visibility, si.supplier_id,
           p.name AS product_name, p.category, p.image,
           u.email AS supplier_email, u.name AS supplier_name,
           sp.company_name
    FROM supplier_inventory si
    JOIN products p ON si.product_id = p.id
    JOIN users u ON si.supplier_id = u.id
    LEFT JOIN seller_profiles sp ON si.supplier_id = sp.user_id
    WHERE si.status = 'Active'
      AND (si.stock <= si.moq OR si.stock <= $1)
  `;
  const params = [threshold];

  if (supplierId) {
    params.push(supplierId);
    query += ` AND si.supplier_id = $${params.length}`;
  }

  query += ` ORDER BY si.stock ASC`;

  const { rows } = await client.query(query, params);
  const itemsWithSeverity = rows.map((item) => ({
    ...item,
    severity: calculateStockSeverity(item.stock, item.moq),
    needsRestock: true,
  }));

  if (autoNotify && itemsWithSeverity.length > 0) {
    for (const item of itemsWithSeverity) {
      await checkAndTriggerLowStockAlert({
        inventoryId: item.id,
        supplierId: item.supplier_id,
        currentStock: item.stock,
        client,
      });
    }
  }

  return {
    scannedCount: rows.length,
    lowStockCount: itemsWithSeverity.length,
    items: itemsWithSeverity,
  };
};

module.exports = {
  DEFAULT_LOW_STOCK_THRESHOLD,
  isLowStock,
  calculateStockSeverity,
  formatStockAlertMessage,
  checkAndTriggerLowStockAlert,
  scanLowStockInventory,
};
