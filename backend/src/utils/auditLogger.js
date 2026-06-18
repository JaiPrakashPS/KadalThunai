const AuditLog = require('../models/AuditLog');

/**
 * Log an admin/officer action to the audit log collection.
 * @param {Object} opts
 * @param {string} opts.actorId
 * @param {string} opts.actorRole
 * @param {string} opts.action
 * @param {string} opts.targetCollection
 * @param {string} opts.targetId
 * @param {Object} [opts.metadata]
 * @param {Object} [opts.req]
 */
const logAudit = async ({ actorId, actorRole, action, targetCollection, targetId, metadata = {}, req }) => {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      action,
      targetCollection,
      targetId,
      metadata,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
    });
  } catch (err) {
    // Audit log failures should never crash the main operation
    console.error('Audit log error:', err.message);
  }
};

module.exports = { logAudit };
