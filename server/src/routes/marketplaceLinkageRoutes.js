const express = require("express");
const authenticateToken = require("../middlewares/authMiddleware");
const { requireBusiness } = require("../middlewares/businessContext");
const {
  getMarketplaces,
  getLinkages,
  createLinkage,
  updateLinkage,
  deleteLinkage,
  previewNumbers,
} = require("../controllers/marketplaceLinkageController");

const router = express.Router();

router.use(authenticateToken);
router.use(requireBusiness);

router.get("/marketplaces", getMarketplaces);
router.get("/preview", previewNumbers);
router.get("/", getLinkages);
router.post("/", createLinkage);
router.put("/:id", updateLinkage);
router.delete("/:id", deleteLinkage);

module.exports = router;
