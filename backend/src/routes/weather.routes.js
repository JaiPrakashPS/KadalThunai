const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getWeather } = require('../controllers/weather.controller');

router.use(authenticate);
router.get('/', getWeather);

module.exports = router;
