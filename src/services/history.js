const prisma = require('../config/db');

/**
 * Store a user-scoped activity/history entry. History writes are deliberately
 * best-effort so a history-table problem never prevents the main health action.
 */
async function recordHistory({ userId, action, module, title, details = null, entityId = null }) {
  if (!userId) return null;
  try {
    return await prisma.activityHistory.create({
      data: {
        userId,
        action,
        module,
        title,
        details,
        entityId
      }
    });
  } catch (err) {
    console.error('History record error:', err.message);
    return null;
  }
}

module.exports = { recordHistory };
