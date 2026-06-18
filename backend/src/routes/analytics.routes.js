const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getOverview, getCatchAnalytics, getSOSAnalytics, getIncidentAnalytics } = require('../controllers/analytics.controller');

router.use(authenticate);
router.get('/overview', authorize('officer', 'admin'), getOverview);
router.get('/catches', authorize('officer', 'admin'), getCatchAnalytics);
router.get('/sos', authorize('officer', 'admin'), getSOSAnalytics);
router.get('/incidents', authorize('officer', 'admin'), getIncidentAnalytics);

module.exports = router;
