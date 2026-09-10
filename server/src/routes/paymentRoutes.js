const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const {
  createRazorpayOrder,
  verifyPayment,
} = require("../controllers/paymentController");

// Both endpoints require authentication — a guest cannot pay.
router.post("/create-order", authenticateToken, createRazorpayOrder);
router.post("/verify", authenticateToken, verifyPayment);

module.exports = router;
