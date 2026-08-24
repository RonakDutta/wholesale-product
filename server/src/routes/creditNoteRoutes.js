const express = require("express");
const {
  createCreditNote,
  listCreditNotes,
  getCreditNote,
  getCreditNoteForInvoice,
  getCreditNotePDF,
} = require("../controllers/creditNoteController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// Only the issuer raises a credit note. When the retailer side is built it
// will read them, but through a route of its own, not this one.
router.use(authenticateToken, authorizeRoles("seller", "both"));

router.get("/", listCreditNotes);
router.post("/", createCreditNote);

// Registered before "/:id" so "by-invoice" is not swallowed as a note id.
router.get("/by-invoice/:invoiceId", getCreditNoteForInvoice);
router.get("/:id", getCreditNote);
router.get("/:id/pdf", getCreditNotePDF);

module.exports = router;
