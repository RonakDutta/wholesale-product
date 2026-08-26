const express = require("express");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const controller = require("../controllers/creditController");

const router = express.Router();
router.use(authenticateToken);

router.get("/accounts", authorizeRoles("seller", "both"), controller.listAccounts);
router.get("/analytics", authorizeRoles("seller", "both"), controller.getAnalytics);
router.get("/wallet", controller.getWallet);
router.get("/:partyId", authorizeRoles("seller", "both"), controller.getAccount);
router.put("/:partyId/limit", authorizeRoles("seller", "both"), controller.updateAccount);
router.post("/payment", authorizeRoles("seller", "both"), controller.receivePayment);
router.get("/statement/:partyId", controller.getStatement);

module.exports = router;