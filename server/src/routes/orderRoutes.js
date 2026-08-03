const express = require("express");
const {
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
} = require("../controllers/orderController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const { getTracking, addCheckpoint } = require("../controllers/trackingController");
const { createLink, getOrderLink } = require("../controllers/driverLinkController");

const router = express.Router();

router.get("/supplier", authenticateToken, authorizeRoles("seller", "both"), getSupplierOrders);
router.get("/buyer", authenticateToken, authorizeRoles("buyer", "both"), getBuyerOrders);
router.post("/create", authenticateToken, authorizeRoles("buyer", "both"), createOrder);
router.get("/:orderId/payment-details", authenticateToken, authorizeRoles("buyer", "both"), getPaymentDetails);
router.put("/:orderId/payment-status", authenticateToken, authorizeRoles("buyer", "both"), updatePaymentStatus);
router.patch("/:orderId/status", authenticateToken, authorizeRoles("seller", "both", "admin"), updateOrderStatus);
router.get("/:orderId/timeline", authenticateToken, getOrderTimelineHandler);
router.get("/:orderId/tracking", authenticateToken, getTracking);
router.post("/:orderId/checkpoints", authenticateToken, authorizeRoles("seller", "both"), addCheckpoint);
router.get("/:orderId/driver-link", authenticateToken, authorizeRoles("seller", "both"), getOrderLink);
router.post("/:orderId/driver-link", authenticateToken, authorizeRoles("seller", "both"), createLink);
router.post("/:orderId/return", authenticateToken, authorizeRoles("buyer", "both"), requestReturn);
router.get("/:orderId/invoice", authenticateToken, generateInvoice);
router.get("/:orderId/packing-slip", authenticateToken, generatePackingSlip);
router.get("/:orderId", authenticateToken, getOrderById);

module.exports = router;
