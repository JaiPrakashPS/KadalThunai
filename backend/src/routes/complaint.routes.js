const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getComplaints, createComplaint, syncComplaints, getComplaintById, updateComplaint } = require('../controllers/complaint.controller');

router.use(authenticate);
router.get('/', getComplaints);
router.post('/', authorize('fisherman'), createComplaint);
router.post('/sync', authorize('fisherman'), syncComplaints);
router.route('/:id').get(getComplaintById).put(authorize('officer', 'admin'), updateComplaint);
router.patch('/:id/respond', authorize('officer', 'admin'), updateComplaint); // PATCH alias for admin

module.exports = router;

