import test from "node:test";
import assert from "node:assert/strict";
import {
  parseNum,
  getEffectivePrice,
  getCheapestSupplier,
  getSortedSuppliers,
  hasVerifiedSupplier,
  sortSuppliers,
  filterSuppliers,
  getBestSupplierMetrics,
  getSupplyLabel,
  getSupplierPhone,
} from "../src/utils/supplierUtils.js";

test("parseNum handles valid numbers and edge cases correctly", () => {
  assert.equal(parseNum(42), 42);
  assert.equal(parseNum("42.5"), 42.5);
  assert.equal(parseNum(null, 10), 10);
  assert.equal(parseNum(undefined, 5), 5);
  assert.equal(parseNum("", 0), 0);
  assert.equal(parseNum("   ", 7), 7);
  assert.equal(parseNum("invalid", 99), 99);
});

test("getEffectivePrice returns discounted price when available, falling back to price", () => {
  assert.equal(getEffectivePrice({ discountPrice: 150, price: 200 }), 150);
  assert.equal(getEffectivePrice({ discount_price: 180, price: 220 }), 180);
  assert.equal(getEffectivePrice({ price: 250 }), 250);
  assert.equal(getEffectivePrice(null), 0);
  assert.equal(getEffectivePrice({}), 0);
});

test("getCheapestSupplier returns cheapest supplier or null safely", () => {
  assert.equal(getCheapestSupplier(null), null);
  assert.equal(getCheapestSupplier({}), null);
  assert.equal(getCheapestSupplier({ suppliers: [] }), null);

  const product = {
    suppliers: [
      { id: "s1", price: 300, discountPrice: 250 },
      { id: "s2", price: 200, discountPrice: 190 },
      { id: "s3", price: 220 },
    ],
  };
  assert.equal(getCheapestSupplier(product).id, "s2");
});

test("getSortedSuppliers safely sorts suppliers by effective price ascending", () => {
  assert.deepEqual(getSortedSuppliers(null), []);
  assert.deepEqual(getSortedSuppliers({ suppliers: null }), []);

  const product = {
    suppliers: [
      { id: "s1", price: 300 },
      { id: "s2", price: 100 },
      { id: "s3", price: 200 },
    ],
  };
  const sorted = getSortedSuppliers(product);
  assert.deepEqual(
    sorted.map((s) => s.id),
    ["s2", "s3", "s1"],
  );
});

test("hasVerifiedSupplier checks verification status safely", () => {
  assert.equal(hasVerifiedSupplier(null), false);
  assert.equal(hasVerifiedSupplier({ suppliers: [] }), false);
  assert.equal(
    hasVerifiedSupplier({ suppliers: [{ id: "1", verified: false }] }),
    false,
  );
  assert.equal(
    hasVerifiedSupplier({
      suppliers: [{ id: "1", verified: false }, { id: "2", verified: true }],
    }),
    true,
  );
});

test("sortSuppliers handles all sort modes and safely handles missing properties", () => {
  assert.deepEqual(sortSuppliers(null, "price-asc"), []);

  const suppliers = [
    { id: "s1", price: 300, rating: 4.2, moq: 50, shippingDays: 3, stock: 100, fulfilledOrders: 10 },
    { id: "s2", price: 100, rating: 4.8, moq: 10, shippingDays: 1, stock: 500, fulfilledOrders: 50 },
    { id: "s3", price: 200, rating: 3.9, moq: 100, shippingDays: 0, stock: 20, fulfilledOrders: 5 },
  ];

  assert.equal(sortSuppliers(suppliers, "price-asc")[0].id, "s2");
  assert.equal(sortSuppliers(suppliers, "price-desc")[0].id, "s1");
  assert.equal(sortSuppliers(suppliers, "highest-rated")[0].id, "s2");
  assert.equal(sortSuppliers(suppliers, "lowest-moq")[0].id, "s2");
  assert.equal(sortSuppliers(suppliers, "fastest-shipping")[0].id, "s3"); // 0 days is fastest
  assert.equal(sortSuppliers(suppliers, "highest-stock")[0].id, "s2");
  assert.equal(sortSuppliers(suppliers, "most-delivered")[0].id, "s2");
});

test("filterSuppliers filters correctly and handles null/undefined filters without throwing", () => {
  const suppliers = [
    { id: "s1", companyName: "Apex Textiles", city: "Surat", country: "India", verified: true, gstVerified: true, moq: 20, shippingDays: 2, rating: 4.5 },
    { id: "s2", companyName: "Bharat Fabrics", city: "Mumbai", country: "India", verified: false, gstVerified: true, moq: 50, shippingDays: 5, rating: 3.8 },
  ];

  // Null/undefined/omitted filters must not throw
  assert.equal(filterSuppliers(suppliers).length, 2);
  assert.equal(filterSuppliers(suppliers, null).length, 2);
  assert.equal(filterSuppliers(suppliers, {}).length, 2);

  // Filter conditions
  assert.equal(filterSuppliers(suppliers, { verifiedOnly: true }).length, 1);
  assert.equal(filterSuppliers(suppliers, { search: "Apex" })[0].id, "s1");
  assert.equal(filterSuppliers(suppliers, { search: "Mumbai" })[0].id, "s2");
  assert.equal(filterSuppliers(suppliers, { maxMOQ: 30 }).length, 1);
  assert.equal(filterSuppliers(suppliers, { minRating: 4.0 }).length, 1);
});

test("getBestSupplierMetrics calculates best metrics safely", () => {
  assert.deepEqual(getBestSupplierMetrics(null), {
    lowestPriceId: null,
    lowestMOQId: null,
    highestRatingId: null,
    fastestShippingId: null,
    mostDeliveredId: null,
    highestStockId: null,
  });

  const suppliers = [
    { id: "s1", price: 100, moq: 50, rating: 4.0, shippingDays: 3, fulfilledOrders: 10, stock: 100 },
    { id: "s2", price: 200, moq: 10, rating: 4.9, shippingDays: 1, fulfilledOrders: 80, stock: 900 },
  ];

  const metrics = getBestSupplierMetrics(suppliers);
  assert.equal(metrics.lowestPriceId, "s1");
  assert.equal(metrics.lowestMOQId, "s2");
  assert.equal(metrics.highestRatingId, "s2");
  assert.equal(metrics.fastestShippingId, "s2");
  assert.equal(metrics.mostDeliveredId, "s2");
  assert.equal(metrics.highestStockId, "s2");
});

test("getSupplyLabel returns appropriate inventory labels", () => {
  assert.equal(getSupplyLabel(0), "Out of stock");
  assert.equal(getSupplyLabel(-5), "Out of stock");
  assert.equal(getSupplyLabel(25), "Low stock");
  assert.equal(getSupplyLabel(100), "High supply");
});

test("getSupplierPhone resolves various phone field names", () => {
  assert.equal(getSupplierPhone({ contactPhone: "9876543210" }), "9876543210");
  assert.equal(getSupplierPhone({ contact_phone: "9876543211" }), "9876543211");
  assert.equal(getSupplierPhone({ phone: "9876543212" }), "9876543212");
  assert.equal(getSupplierPhone(null), undefined);
});
