const express = require("express");
const { getSupplierOrders } = require("../controllers/orderController");
const authenticateToken = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/supplier", authenticateToken, getSupplierOrders);

module.exports = router;
