const express = require("express");
const {
  addProduct,
  getPublicCatalog,
  getProductById,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
  contactSupplier,
  getWholesalerById,
} = require("../controllers/productController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", getPublicCatalog);
router.get("/wholesaler/:id", getWholesalerById);
router.get("/:id/contact", authenticateToken, contactSupplier);
router.get("/:id", getProductById);
router.post("/", authenticateToken, authorizeRoles("seller", "both"), addProduct);
router.get("/inventory/:id", authenticateToken, authorizeRoles("seller", "both"), getInventoryItemById);
router.put("/inventory/:id", authenticateToken, authorizeRoles("seller", "both"), updateInventoryItem);
router.delete("/inventory/:id", authenticateToken, authorizeRoles("seller", "both"), deleteInventoryItem);

module.exports = router;
