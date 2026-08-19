const express = require("express");
const {
  createSale,
  listSales,
  getSaleById,
  updateSaleStatus,
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
router.patch("/:id/status", updateSaleStatus);

module.exports = router;
