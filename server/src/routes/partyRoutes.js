const express = require("express");
const {
  listParties,
  getPartyById,
  createParty,
  updateParty,
  getPartyStats,
  getPartyStatement,
  getPartyStatementPDF,
  recordPayment,
} = require("../controllers/partyController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const { requirePermission } = require("../middlewares/businessContext");

const router = express.Router();

// A customer book belongs to a wholesaler. Nothing here is buyer facing.
router.use(authenticateToken, authorizeRoles("seller", "both"));

// Registered before "/:id" so the word is not read as a party id.
router.get("/stats", requirePermission("money"), getPartyStats);

router.get("/", requirePermission("customers"), listParties);
router.post("/", requirePermission("customers"), createParty);
router.get("/:id", requirePermission("customers"), getPartyById);
router.put("/:id", requirePermission("customers"), updateParty);
router.post("/:id/payments", requirePermission("payments"), recordPayment);
router.get("/:id/statement", requirePermission("money"), getPartyStatement);
router.get("/:id/statement/pdf", requirePermission("money"), getPartyStatementPDF);

module.exports = router;
