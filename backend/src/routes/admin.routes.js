const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getOverview, getUsers, updateUserStatus, createOfficer, getOfficers, getAuditLogs } = require('../controllers/admin.controller');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/overview', getOverview);
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.post('/officers', createOfficer);
router.get('/officers', getOfficers);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
