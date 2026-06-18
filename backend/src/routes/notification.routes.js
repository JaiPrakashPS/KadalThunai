const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getNotifications, broadcastNotification, markAsRead } = require('../controllers/notification.controller');

router.use(authenticate);
router.get('/', getNotifications);
router.post('/broadcast', authorize('officer', 'admin'), broadcastNotification);
router.put('/:id/read', markAsRead);

module.exports = router;
