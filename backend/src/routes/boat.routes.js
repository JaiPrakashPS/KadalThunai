const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getBoats, createBoat, getBoatById, updateBoat, deleteBoat } = require('../controllers/boat.controller');

router.use(authenticate);

router.route('/').get(getBoats).post(authorize('fisherman'), createBoat);
router.route('/:id').get(getBoatById).put(updateBoat).delete(deleteBoat);

module.exports = router;
