const express = require("express");
const {
  createOrder,
  getPaymentDetails,
  initiatePayment,
  updatePaymentStatus,
  getOrderById,
  getSupplierOrders,
  getBuyerOrders,
  updateOrderStatus,
  cancelOrderHandler,
  getOrderTimelineHandler,
  requestReturn,
  generateInvoice,
  generatePackingSlip,
  sendInstallmentReminder,
} = require("../controllers/orderController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const { getTracking, addCheckpoint } = require("../controllers/trackingController");
const { createLink, getOrderLink } = require("../controllers/driverLinkController");

const router = express.Router();

// Anything a buyer owns is authorized per order, by buyer_id, inside the
// handler. Gating those on the account role as well hid a seller's own
// purchases from them and, because the client treats 403 as a dead session,
// logged them out mid-browse. Supplier-side routes stay role-gated: they act
// on someone else's order.
router.get("/supplier", authenticateToken, authorizeRoles("seller", "both"), getSupplierOrders);
router.get("/buyer", authenticateToken, getBuyerOrders);
router.post("/create", authenticateToken, createOrder);
router.get("/:orderId/payment-details", authenticateToken, getPaymentDetails);
router.post("/:orderId/payment", authenticateToken, initiatePayment);
router.post("/:orderId/send-installment-reminder", authenticateToken, authorizeRoles("seller", "both", "admin"), sendInstallmentReminder);
router.put("/:orderId/payment-status", authenticateToken, updatePaymentStatus);
router.patch("/:orderId/status", authenticateToken, authorizeRoles("seller", "both", "admin"), updateOrderStatus);
// Not role gated. Both sides of an order may call it off, and who is allowed
// is decided against the order itself. Gating this on the seller role would
// take a buyer's own cancel button away, and a 403 logs people out.
router.post("/:orderId/cancel", authenticateToken, cancelOrderHandler);
router.get("/:orderId/timeline", authenticateToken, getOrderTimelineHandler);
router.get("/:orderId/tracking", authenticateToken, getTracking);
router.post("/:orderId/checkpoints", authenticateToken, authorizeRoles("seller", "both"), addCheckpoint);
router.get("/:orderId/driver-link", authenticateToken, authorizeRoles("seller", "both"), getOrderLink);
router.post("/:orderId/driver-link", authenticateToken, authorizeRoles("seller", "both"), createLink);
router.post("/:orderId/return", authenticateToken, requestReturn);
router.get("/:orderId/invoice", authenticateToken, generateInvoice);
router.get("/:orderId/packing-slip", authenticateToken, generatePackingSlip);
router.get("/:orderId", authenticateToken, getOrderById);

module.exports = router;
