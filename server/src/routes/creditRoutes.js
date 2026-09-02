const express = require("express");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const controller = require("../controllers/creditController");

const router = express.Router();
router.use(authenticateToken);
router.get("/eligibility", controller.eligibility);
router.get("/wallet", controller.wallet);
router.get("/accounts", authorizeRoles("seller", "both"), controller.listAccounts);
router.get("/analytics", authorizeRoles("seller", "both"), controller.analytics);
router.get("/statement/:partyId", controller.statement);
router.get("/:partyId", controller.getAccount);
router.put("/:partyId/limit", authorizeRoles("seller", "both"), controller.updateLimit);
router.post("/payment", authorizeRoles("seller", "both"), controller.receivePayment);
module.exports = router;
