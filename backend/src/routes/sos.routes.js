const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { createSOS, syncSOS, getSOSRequests, updateSOSStatus } = require('../controllers/sos.controller');

router.use(authenticate);

router.post('/', authorize('fisherman'), createSOS);
router.post('/sync', authorize('fisherman'), syncSOS);
router.get('/', authorize('officer', 'admin'), getSOSRequests);
router.put('/:id/status', authorize('officer', 'admin'), updateSOSStatus);
router.patch('/:id/status', authorize('officer', 'admin'), updateSOSStatus); // PATCH alias

module.exports = router;
