const express = require("express");
const {
  createSale,
  listSales,
  getSaleById,
  updateSale,
  updateSaleStatus,
  createInvoiceForSale,
  getInvoiceForSale,
} = require("../controllers/saleController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// A wholesaler's own sales book. Retailer-created sales will arrive through
// a separate route when ordering is built; these are the ones he records.
router.use(authenticateToken, authorizeRoles("seller", "both"));

router.get("/", listSales);
router.post("/", createSale);
router.get("/:id", getSaleById);
router.put("/:id", updateSale);
router.patch("/:id/status", updateSaleStatus);
router.get("/:id/invoice", getInvoiceForSale);
router.post("/:id/invoice", createInvoiceForSale);

module.exports = router;
