const express = require("express");
const {
  listParties,
  getPartyById,
  createParty,
  updateParty,
  getPartyStats,
  recordPayment,
} = require("../controllers/partyController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// A customer book belongs to a wholesaler. Nothing here is buyer facing.
router.use(authenticateToken, authorizeRoles("seller", "both"));

// Registered before "/:id" so the word is not read as a party id.
router.get("/stats", getPartyStats);

router.get("/", listParties);
router.post("/", createParty);
router.get("/:id", getPartyById);
router.put("/:id", updateParty);
router.post("/:id/payments", recordPayment);

module.exports = router;
