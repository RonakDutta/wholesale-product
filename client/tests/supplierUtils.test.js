import test from "node:test";
import assert from "node:assert/strict";
import {
  parseNum,
  getEffectivePrice,
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
