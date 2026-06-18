const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorRole: { type: String },
    action: {
      type: String,
      required: [true, 'Action is required'],
      // e.g., 'CREATE_OFFICER', 'DELETE_USER', 'UPDATE_SCHEME', 'RESOLVE_COMPLAINT'
    },
    targetCollection: { type: String },
    targetId: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
