const express = require("express");
const { getOverview, getBreakdown } = require("../controllers/overviewController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("seller", "both"),
  getOverview,
);

// The rows behind one of the three figures on the Overview.
router.get(
  "/breakdown",
  authenticateToken,
  authorizeRoles("seller", "both"),
  getBreakdown,
);

module.exports = router;
