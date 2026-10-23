const ActivityLog = require('../models/ActivityLog');

/**
 * Log platform activity asynchronously and safely without throwing errors.
 * Sanitizes sensitive fields before recording.
 */
const logActivity = async ({ actor, action, resourceType, resourceId, metadata = {}, req = null }) => {
  try {
    // Sanitize metadata to never include sensitive fields
    const safeMetadata = { ...metadata };
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'correctAnswer', 'answerKey'];
    sensitiveKeys.forEach((key) => {
      delete safeMetadata[key];
    });

    const ipAddress = req ? req.headers['x-forwarded-for'] || req.socket.remoteAddress : '';

    await ActivityLog.create({
      actor: actor?._id || null,
      actorRole: actor?.role || 'system',
      actorName: actor?.name || 'System',
      actorEmail: actor?.email || '',
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : null,
      metadata: safeMetadata,
      ipAddress,
    });
  } catch (err) {
    // Silent catch so activity logging failure never interrupts main business logic
    console.error('[ActivityLog Error]', err.message);
  }
};

module.exports = { logActivity };
