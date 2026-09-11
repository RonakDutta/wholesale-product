const express = require("express");
const {
  createForSale,
  createForOrder,
  listForOrder,
  listChallans,
  listForSale,
  getChallan,
  getChallanPdf,
} = require("../controllers/challanController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const { requirePermission } = require("../middlewares/businessContext");

const router = express.Router();

// A challan is a billing document, so it sits behind the same permission as
// invoices: whoever may raise a bill may send goods out against one.
router.use(authenticateToken, authorizeRoles("seller", "both"));

router.get("/", requirePermission("invoices"), listChallans);
router.get("/sale/:id", requirePermission("invoices"), listForSale);
router.post("/sale/:id", requirePermission("invoices"), createForSale);
// The same, from the order screen. An accepted order has a sale behind it.
router.get("/order/:id", requirePermission("invoices"), listForOrder);
router.post("/order/:id", requirePermission("invoices"), createForOrder);
router.get("/:id", requirePermission("invoices"), getChallan);
router.get("/:id/pdf", requirePermission("invoices"), getChallanPdf);

module.exports = router;
