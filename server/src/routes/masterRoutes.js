const express = require("express");
const { getMasters } = require("../controllers/masterController");
const authenticateToken = require("../middlewares/authMiddleware");

const router = express.Router();

// Read only for now. The admin console that writes these is the next step, and
// it will sit behind requirePlatformAdmin rather than behind this route.
router.get("/", authenticateToken, getMasters);

module.exports = router;
