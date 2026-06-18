const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getIncidents, createIncident, syncIncidents, getIncidentById, updateIncident } = require('../controllers/incident.controller');

router.use(authenticate);
router.get('/', getIncidents);
router.post('/', authorize('fisherman'), createIncident);
router.post('/sync', authorize('fisherman'), syncIncidents);
router.route('/:id').get(getIncidentById).put(authorize('officer', 'admin'), updateIncident);
router.patch('/:id/status', authorize('officer', 'admin'), updateIncident); // PATCH alias

module.exports = router;
