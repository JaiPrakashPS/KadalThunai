const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getOverview, getUsers, updateUserStatus, createOfficer, getOfficers, getAuditLogs } = require('../controllers/admin.controller');

router.use(authenticate);

router.get('/overview', authorize('admin'), getOverview);
router.get('/users', authorize('admin', 'officer'), getUsers);
router.put('/users/:id/status', authorize('admin'), updateUserStatus);
router.post('/officers', authorize('admin'), createOfficer);
router.get('/officers', authorize('admin'), getOfficers);
router.get('/audit-logs', authorize('admin'), getAuditLogs);

module.exports = router;
