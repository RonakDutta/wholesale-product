const express = require('express');
const {
  getFlashSales,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  getDiscountedProducts,
  validateCoupon,
  applyCoupon,
  removeCoupon,
  getLoyaltyDashboard,
  getReferralsDashboard,
  purchaseGiftCard,
  redeemGiftCard,
  getGiftCardBalance,
  getGiftCardHistory,
} = require('../controllers/promotionController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/flash-sales', authenticateToken, getFlashSales);
router.post('/flash-sales', authenticateToken, authorizeRoles('admin'), createFlashSale);
router.put('/flash-sales/:id', authenticateToken, authorizeRoles('admin'), updateFlashSale);
router.delete('/flash-sales/:id', authenticateToken, authorizeRoles('admin'), deleteFlashSale);
router.get('/discounted-products', authenticateToken, getDiscountedProducts);
router.get('/coupons/validate', authenticateToken, validateCoupon);
router.post('/coupons/apply', authenticateToken, applyCoupon);
router.delete('/coupons/remove', authenticateToken, removeCoupon);
router.get('/loyalty', authenticateToken, getLoyaltyDashboard);
router.get('/referrals', authenticateToken, getReferralsDashboard);
router.post('/gift-cards/purchase', authenticateToken, purchaseGiftCard);
router.post('/gift-cards/redeem', authenticateToken, redeemGiftCard);
router.get('/gift-cards/balance', authenticateToken, getGiftCardBalance);
router.get('/gift-cards/history', authenticateToken, getGiftCardHistory);

module.exports = router;
