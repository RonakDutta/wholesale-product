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

const router = express.Router();

router.get("/supplier", authenticateToken, authorizeRoles("seller", "both"), getSupplierOrders);
router.get("/buyer", authenticateToken, authorizeRoles("buyer", "both"), getBuyerOrders);
router.post("/create", authenticateToken, authorizeRoles("buyer", "both"), createOrder);
router.get("/:orderId/payment-details", authenticateToken, authorizeRoles("buyer", "both"), getPaymentDetails);
router.put("/:orderId/payment-status", authenticateToken, authorizeRoles("buyer", "both"), updatePaymentStatus);
router.patch("/:orderId/status", authenticateToken, authorizeRoles("seller", "both", "admin"), updateOrderStatus);
router.get("/:orderId/timeline", authenticateToken, getOrderTimelineHandler);
router.post("/:orderId/return", authenticateToken, authorizeRoles("buyer", "both"), requestReturn);
router.get("/:orderId/invoice", authenticateToken, generateInvoice);
router.get("/:orderId/packing-slip", authenticateToken, generatePackingSlip);
router.get("/:orderId", authenticateToken, getOrderById);

module.exports = router;
