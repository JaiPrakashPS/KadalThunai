const Notification = require('../models/Notification');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { paginate, paginateMeta } = require('../utils/paginate');
const { sendMulticastNotification } = require('../services/notification.stub');

const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {
    $or: [
      { targetRole: 'all' },
      { targetRole: req.user.role },
      { targetUserId: req.user._id },
    ],
  };

  const [notifications, total] = await Promise.all([
    Notification.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Notification.countDocuments(filter),
  ]);
  res.json({ success: true, data: notifications, pagination: paginateMeta(total, page, limit) });
});

const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, titleTamil, body, bodyTamil, targetRole, type, priority } = req.body;

  const notification = await Notification.create({
    title, titleTamil, body, bodyTamil,
    type: type || 'announcement',
    targetRole: targetRole || 'all',
    sentBy: req.user._id,
    priority: priority || 'normal',
  });

  // Gather FCM tokens for targeted users
  const userFilter = targetRole && targetRole !== 'all' ? { role: targetRole, isActive: true } : { isActive: true };
  const users = await User.find(userFilter).select('fcmToken');
  const tokens = users.map(u => u.fcmToken).filter(Boolean);

  if (tokens.length > 0) {
    await sendMulticastNotification({ fcmTokens: tokens, title, body });
  }

  res.status(201).json({ success: true, message: `Notification broadcast to ${users.length} users.`, data: notification });
});

const markAsRead = asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ success: true, message: 'Marked as read.' });
});

module.exports = { getNotifications, broadcastNotification, markAsRead };
