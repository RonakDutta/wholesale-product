const express = require("express");
const {
  listItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} = require("../controllers/itemController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// A rate list belongs to one wholesaler and is never buyer facing.
router.use(authenticateToken, authorizeRoles("seller", "both"));

router.get("/", listItems);
router.post("/", createItem);
router.get("/:id", getItemById);
router.put("/:id", updateItem);
router.delete("/:id", deleteItem);

module.exports = router;
