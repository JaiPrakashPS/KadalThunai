const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getZones, getZoneById, createZone, syncZones, updateZone, deleteZone } = require('../controllers/fishingZone.controller');

router.use(authenticate);

router.post('/sync', authorize('fisherman'), syncZones);

router.route('/')
  .get(getZones)
  .post(authorize('fisherman'), createZone);

router.route('/:id')
  .get(getZoneById)
  .put(authorize('fisherman', 'admin'), updateZone)
  .delete(authorize('fisherman', 'admin'), deleteZone);

module.exports = router;
