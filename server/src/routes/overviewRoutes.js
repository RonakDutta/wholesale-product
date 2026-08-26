const express = require("express");
const { getOverview } = require("../controllers/overviewController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("seller", "both"),
  getOverview,
);

module.exports = router;
