const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getZones, getZoneById, createZone, updateZone, deleteZone } = require('../controllers/fishingZone.controller');

router.use(authenticate);

router.route('/').get(getZones).post(authorize('officer', 'admin'), createZone);
router.route('/:id').get(getZoneById).put(authorize('officer', 'admin'), updateZone).delete(authorize('admin'), deleteZone);

module.exports = router;
