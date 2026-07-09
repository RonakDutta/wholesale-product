const express = require("express");
const {
  addProduct,
  getPublicCatalog,
  getProductById,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
} = require("../controllers/productController");
const authenticateToken = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", getPublicCatalog);
router.get("/:id", getProductById);
router.post("/", authenticateToken, addProduct);
router.get("/inventory/:id", authenticateToken, getInventoryItemById);
router.put("/inventory/:id", authenticateToken, updateInventoryItem);
router.delete("/inventory/:id", authenticateToken, deleteInventoryItem);

module.exports = router;
