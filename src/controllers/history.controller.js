const prisma = require('../config/db');
const { ok } = require('../utils/api');

async function list(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '100', 10) || 100, 1), 250);
  const items = await prisma.activityHistory.findMany({
    where: { userId: req.userId },
    orderBy: { occurredAt: 'desc' },
    take: limit
  });
  return ok(res, items);
}

module.exports = { list };
