const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  getFishPrices,
  getFishPriceTrends,
  triggerSync,
  createFishPrice,
  updateFishPrice
} = require('../controllers/fishPrice.controller');

router.use(authenticate);

router.get('/', getFishPrices);
router.get('/trends', getFishPriceTrends);
router.post('/sync', authorize('officer', 'admin'), triggerSync);
router.post('/', authorize('officer', 'admin'), createFishPrice);
router.put('/:id', authorize('officer', 'admin'), updateFishPrice);

module.exports = router;
