const { ok, fail } = require('../utils/api');
const { getNetworkEndpoints, processDeviceSync } = require('../services/deviceSyncService');
const prisma = require('../config/db');

async function getEndpoints(req, res) {
  try {
    const endpoints = getNetworkEndpoints();
    return ok(res, endpoints);
  } catch (err) {
    return fail(res, 500, err.message);
  }
}

async function syncReading(req, res) {
  try {
    const { deviceType, connectionType, deviceName, data, value, readingType, systolic, diastolic, pulse } = req.body;

    // Normalizing payload format
    const payloadData = data || {
      value: value,
      readingType: readingType,
      systolic: systolic,
      diastolic: diastolic,
      pulse: pulse
    };

    // If request comes with auth cookie, use req.userId
    let userId = req.userId;
    if (!userId) {
      // Find default user or most active user for local network device webhook
      const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
      if (firstUser) userId = firstUser.id;
    }

    if (!userId) {
      return fail(res, 401, 'Please log in to SheCare or register an account before syncing devices.');
    }

    const syncResult = await processDeviceSync({
      userId,
      deviceType: deviceType || (payloadData.systolic ? 'bp' : 'glucose'),
      connectionType: connectionType || 'bluetooth',
      deviceName: deviceName || 'External Medical Device',
      data: payloadData
    });

    return ok(res, syncResult, 201);
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

module.exports = { getEndpoints, syncReading };
