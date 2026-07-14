const express = require("express");
const {
  createOrder,
  getPaymentDetails,
  updatePaymentStatus,
  getOrderById,
} = require("../controllers/orderController");
const authenticateToken = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/create", authenticateToken, createOrder);
router.get("/:orderId/payment-details", authenticateToken, getPaymentDetails);
router.put("/:orderId/payment-status", authenticateToken, updatePaymentStatus);
router.get("/:orderId", authenticateToken, getOrderById);

module.exports = router;
