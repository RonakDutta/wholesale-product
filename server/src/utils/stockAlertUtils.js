const DEFAULT_LOW_STOCK_THRESHOLD = 50;

/**
 * Calculates severity level for a given stock count and MOQ.
 */
const calculateStockSeverity = (stock, moq = 1) => {
  const safeStock = Math.max(0, Number(stock) || 0);
  const safeMoq = Math.max(1, Number(moq) || 1);

  if (safeStock <= 0) return "out_of_stock";
  if (safeStock < safeMoq) return "critical";
  return "warning";
};

/**
 * Evaluates whether an inventory item has dropped below its low stock threshold or MOQ.
 */
const isLowStock = (item, threshold = DEFAULT_LOW_STOCK_THRESHOLD) => {
  if (!item) return false;
  const stock = Number(item.stock ?? 0);
  const moq = Number(item.moq ?? 1);
  const limit = Math.max(moq, Number(threshold) || DEFAULT_LOW_STOCK_THRESHOLD);
  return stock <= limit;
};

/**
 * Generates alert title, message, and formatted payload for low-stock triggers.
 */
const formatStockAlertMessage = (item) => {
  const stock = Number(item.stock ?? 0);
  const moq = Number(item.moq ?? 1);
  const productName = item.name || item.product_name || "Listed Product";
  const severity = calculateStockSeverity(stock, moq);

  let title = "";
  let message = "";

  if (severity === "out_of_stock") {
    title = `🚨 Out of Stock: ${productName}`;
    message = `"${productName}" is completely out of stock (0 units remaining). Listings cannot receive new buyer orders until restocked.`;
  } else if (severity === "critical") {
    title = `⚠️ Critical Low Stock: ${productName}`;
    message = `"${productName}" has only ${stock} units left, which is below your minimum order quantity of ${moq} units.`;
  } else {
    title = `📦 Low Stock Notice: ${productName}`;
    message = `"${productName}" is running low with ${stock} units remaining. Consider restocking to maintain active wholesale availability.`;
  }

  return {
    severity,
    title,
    message,
    productName,
    stockLeft: stock,
    moq,
    category: item.category || "General",
  };
};

module.exports = {
  DEFAULT_LOW_STOCK_THRESHOLD,
  calculateStockSeverity,
  isLowStock,
  formatStockAlertMessage,
};
