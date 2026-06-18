const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getMarketPrices, createMarketPrice, updateMarketPrice, fetchLivePrices } = require('../controllers/marketPrice.controller');

router.use(authenticate);
router.get('/', getMarketPrices);
router.post('/', authorize('officer', 'admin'), createMarketPrice);
router.get('/fetch-live', authorize('officer', 'admin'), fetchLivePrices);
router.put('/:id', authorize('officer', 'admin'), updateMarketPrice);

module.exports = router;
