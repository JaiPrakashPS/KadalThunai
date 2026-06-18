const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      maxlength: 200,
    },
    titleTamil: { type: String },
    body: {
      type: String,
      required: [true, 'Notification body is required'],
      maxlength: 1000,
    },
    bodyTamil: { type: String },
    type: {
      type: String,
      enum: ['weather', 'emergency', 'scheme', 'announcement', 'sos_update', 'system'],
      default: 'announcement',
    },
    targetRole: {
      type: String,
      enum: ['all', 'fisherman', 'officer', 'admin'],
      default: 'all',
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = broadcast
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isRead: { type: Boolean, default: false },
    fcmSent: { type: Boolean, default: false }, // FCM - wired later
    priority: {
      type: String,
      enum: ['normal', 'high'],
      default: 'normal',
    },
  },
  { timestamps: true }
);

notificationSchema.index({ targetRole: 1, createdAt: -1 });
notificationSchema.index({ targetUserId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
