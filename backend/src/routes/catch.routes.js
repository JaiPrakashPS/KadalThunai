const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getCatches, createCatch, syncCatches, getMonthlySummary } = require('../controllers/catch.controller');

router.use(authenticate);

router.get('/summary/monthly', authorize('fisherman'), getMonthlySummary);
router.post('/sync', authorize('fisherman'), syncCatches);
router.route('/').get(getCatches).post(authorize('fisherman'), createCatch);

module.exports = router;
