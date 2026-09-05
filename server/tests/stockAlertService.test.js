const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isLowStock,
  calculateStockSeverity,
  formatStockAlertMessage,
  DEFAULT_LOW_STOCK_THRESHOLD,
} = require("../src/utils/stockAlertUtils");

test("calculateStockSeverity determines correct alert urgency", () => {
  assert.equal(calculateStockSeverity(0, 10), "out_of_stock");
  assert.equal(calculateStockSeverity(-5, 20), "out_of_stock");
  assert.equal(calculateStockSeverity(5, 10), "critical"); // below MOQ
  assert.equal(calculateStockSeverity(10, 10), "warning");
  assert.equal(calculateStockSeverity(50, 10), "warning");
});

test("isLowStock detects items requiring restocking based on stock, MOQ, and threshold", () => {
  // Out of stock
  assert.equal(isLowStock({ stock: 0, moq: 10 }), true);

  // Below MOQ
  assert.equal(isLowStock({ stock: 5, moq: 20 }), true);

  // Below default threshold (50)
  assert.equal(isLowStock({ stock: 35, moq: 10 }), true);

  // Custom threshold
  assert.equal(isLowStock({ stock: 80, moq: 10 }, 100), true);
  assert.equal(isLowStock({ stock: 80, moq: 10 }, 50), false);

  // Well stocked
  assert.equal(isLowStock({ stock: 500, moq: 50 }), false);

  // Null / undefined safety
  assert.equal(isLowStock(null), false);
  assert.equal(isLowStock(undefined), false);
});

test("formatStockAlertMessage creates descriptive and structured alert details", () => {
  // Out of stock
  const outMsg = formatStockAlertMessage({
    name: "Pure Silk Saree",
    stock: 0,
    moq: 10,
    category: "Apparel",
  });
  assert.equal(outMsg.severity, "out_of_stock");
  assert.match(outMsg.title, /Out of Stock/);
  assert.equal(outMsg.stockLeft, 0);
  assert.equal(outMsg.moq, 10);

  // Critical below MOQ
  const critMsg = formatStockAlertMessage({
    product_name: "Cotton Yarn Rolls",
    stock: 8,
    moq: 25,
    category: "Textiles",
  });
  assert.equal(critMsg.severity, "critical");
  assert.match(critMsg.title, /Critical Low Stock/);
  assert.match(critMsg.message, /below your minimum order quantity/);

  // General warning
  const warnMsg = formatStockAlertMessage({
    name: "Denim Jeans",
    stock: 40,
    moq: 20,
  });
  assert.equal(warnMsg.severity, "warning");
  assert.match(warnMsg.title, /Low Stock Notice/);
});
