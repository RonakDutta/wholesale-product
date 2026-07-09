const express = require("express");
const {
  getInventory,
  getDashboardStats,
} = require("../controllers/dashboardController");
const authenticateToken = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/inventory", authenticateToken, getInventory);
router.get("/stats", authenticateToken, getDashboardStats);

module.exports = router;
