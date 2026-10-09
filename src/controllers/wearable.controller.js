/**
 * SheCare Wearables Controller
 * Secure APIs for wearable connection management, near real-time synchronization,
 * latest metrics, historical graphs, daily summaries, alerts, and demo mode.
 */

'use strict';

const prisma = require('../config/db');
const { ok, fail } = require('../utils/api');
const WearableSyncService = require('../services/wearables/wearableSyncService');
const { PROVIDER_REGISTRY, getProvider } = require('../services/wearables/providerRegistry');
const { WEARABLE_PROVIDERS } = require('../services/wearables/wearableConstants');

/**
 * GET /api/wearables/providers
 * List all supported wearable providers and their capabilities
 */
async function getProviders(req, res) {
  try {
    const list = Object.values(WEARABLE_PROVIDERS);
    return ok(res, list);
  } catch (err) {
    return fail(res, 500, err.message);
  }
}

async function resolveUserId(req) {
  if (req.userId) return req.userId;
  const defaultUser = await prisma.user.findFirst({ select: { id: true } });
  return defaultUser ? defaultUser.id : null;
}

/**
 * GET /api/wearables/status
 * Check user's current wearable connections and sync statuses
 */
async function getStatus(req, res) {
  try {
    const userId = await resolveUserId(req);
    const isDemo = req.query.demo === 'true';

    const providers = Object.values(WEARABLE_PROVIDERS);

    if (!userId) {
      // Unauthenticated visitor and no user exists: return available providers and empty state
      return ok(res, {
        providers,
        connections: [],
        connectedCount: 0,
        lastSyncedAt: null,
        latestMetrics: {},
        activeAlerts: [],
        isDemoActive: false
      });
    }

    const connections = await prisma.wearableConnection.findMany({
      where: { userId, isDemo },
      orderBy: { updatedAt: 'desc' }
    });

    const mappedConnections = connections.map(c => {
      if (c.provider === 'WEAR_OS' && c.deviceName && c.deviceName.toLowerCase().includes('noise')) {
        return { ...c, provider: 'NOISE_FIT' };
      }
      return c;
    });

    const activeAlerts = await prisma.wearableAlert.findMany({
      where: { userId, isDismissed: false },
      orderBy: { triggeredAt: 'desc' },
      take: 10
    });

    const latest = await WearableSyncService.getLatestMetrics(userId, isDemo);
    const connectedCount = mappedConnections.filter(c => c.status === 'CONNECTED').length;
    const lastSyncedAt = mappedConnections.length > 0 ? mappedConnections[0].lastSyncedAt : null;

    return ok(res, {
      providers,
      connections: mappedConnections,
      connectedCount,
      lastSyncedAt,
      latestMetrics: latest,
      activeAlerts,
      isDemoActive: isDemo || mappedConnections.some(c => c.provider === 'DEMO_SIMULATOR' && c.status === 'CONNECTED')
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}

/**
 * POST /api/wearables/connect
 * Establish or update a wearable connection with explicit user consent
 */
async function connect(req, res) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return fail(res, 401, 'User account required.');
    const { provider, deviceName, deviceModel, platformOs, permittedMetrics, isDemo, metadata } = req.body;

    if (!provider) {
      return fail(res, 400, 'Provider identifier is required (e.g. ANDROID_HEALTH_CONNECT, APPLE_HEALTH_KIT, FITBIT, DEMO_SIMULATOR).');
    }

    const connection = await WearableSyncService.connectWearable({
      userId,
      provider,
      deviceName,
      deviceModel,
      platformOs,
      permittedMetrics: permittedMetrics || [],
      isDemo: Boolean(isDemo),
      metadata
    });

    return ok(res, {
      message: `Successfully connected ${connection.deviceName || provider}.`,
      connection
    });
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

/**
 * POST /api/wearables/sync
 * Secure, rate-limited, idempotent synchronization of wearable samples
 */
async function sync(req, res) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return fail(res, 401, 'User account required.');
    const { provider, samples, isDemo } = req.body;

    if (!provider) {
      return fail(res, 400, 'Provider is required.');
    }

    const result = await WearableSyncService.syncWearableData({
      userId,
      provider,
      samples: Array.isArray(samples) ? samples : [],
      isDemo: Boolean(isDemo)
    });

    return ok(res, result);
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

/**
 * POST /api/wearables/demo/generate
 * Dedicated endpoint to generate clearly labeled test data in Development / Demo mode
 */
async function generateDemoData(req, res) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return fail(res, 401, 'User account required.');
    const { days = 7, metrics } = req.body;

    const demoProvider = getProvider('DEMO_SIMULATOR');
    const samples = demoProvider.generateDemoReadings(
      metrics || ['HEART_RATE', 'RESTING_HEART_RATE', 'STEPS', 'SLEEP_DURATION', 'SPO2', 'SKIN_TEMPERATURE'],
      Math.min(30, Math.max(1, Number(days) || 7))
    );

    const result = await WearableSyncService.syncWearableData({
      userId,
      provider: 'DEMO_SIMULATOR',
      samples,
      isDemo: true
    });

    return ok(res, {
      message: 'Demo health data generated successfully. All records are clearly marked as DEMO DATA.',
      note: 'DEMO DATA — NOT REAL HEALTH DATA',
      result
    });
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

/**
 * GET /api/wearables/latest
 * Retrieve the latest verified reading for each biometric metric
 */
async function getLatest(req, res) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return ok(res, { metrics: {}, isDemo: false });
    const isDemo = req.query.demo === 'true';
    const latest = await WearableSyncService.getLatestMetrics(userId, isDemo);
    return ok(res, {
      metrics: latest,
      isDemo
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}

/**
 * GET /api/wearables/history
 * Retrieve actual timestamped samples for historical graphs (Today, 7 days, 30 days)
 * Does NOT interpolate missing medical measurements.
 */
async function getHistory(req, res) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return ok(res, { metricType: req.query.metric || 'HEART_RATE', period: req.query.period || '7d', count: 0, readings: [] });
    const metricType = req.query.metric || 'HEART_RATE';
    const period = req.query.period || '7d'; // 'today', '7d', '30d'
    const isDemo = req.query.demo === 'true';

    const now = new Date();
    let startDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else {
      // Default 7 days
      startDate.setDate(now.getDate() - 7);
    }

    const readings = await prisma.wearableReading.findMany({
      where: {
        userId,
        metricType,
        isDemo,
        timestamp: { gte: startDate, lte: now }
      },
      orderBy: { timestamp: 'asc' },
      take: 2000,
      select: {
        id: true,
        value: true,
        unit: true,
        timestamp: true,
        source: true,
        deviceName: true,
        isDemo: true
      }
    });

    // Compute basic statistics over real measurements only
    let min = null;
    let max = null;
    let avg = null;

    if (readings.length > 0) {
      const vals = readings.map(r => r.value);
      min = Math.min(...vals);
      max = Math.max(...vals);
      avg = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
    }

    return ok(res, {
      metricType,
      period,
      isDemo,
      count: readings.length,
      statistics: { min, max, avg, count: readings.length },
      stats: { min, max, avg, count: readings.length },
      readings
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}

/**
 * GET /api/wearables/daily-summary
 * Retrieve daily aggregated summaries (steps, avg HR, sleep hours, etc.)
 */
async function getDailySummary(req, res) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return ok(res, { summaries: [], days: 14, isDemo: false });
    const days = Math.min(60, Math.max(1, Number(req.query.days) || 14));
    const isDemo = req.query.demo === 'true';

    const cutoff = new Date(Date.now() - days * 86400000);

    const summaries = await prisma.wearableDailySummary.findMany({
      where: {
        userId,
        isDemo,
        date: { gte: cutoff }
      },
      orderBy: { date: 'asc' }
    });

    return ok(res, {
      summaries,
      days,
      isDemo
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
}

/**
 * POST /api/wearables/disconnect
 * Disconnect wearable device
 */
async function disconnect(req, res) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return fail(res, 401, 'User account required.');
    const { provider, isDemo } = req.body;
    if (!provider) return fail(res, 400, 'Provider is required.');

    const result = await WearableSyncService.disconnectWearable(userId, provider, Boolean(isDemo));
    return ok(res, result);
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

/**
 * POST /api/wearables/revoke
 * Revoke permission and optionally delete stored health records
 */
async function revoke(req, res) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return fail(res, 401, 'User account required.');
    const { provider, purgeData, isDemo } = req.body;
    if (!provider) return fail(res, 400, 'Provider is required.');

    const result = await WearableSyncService.revokeAuthorization(
      userId,
      provider,
      Boolean(purgeData),
      Boolean(isDemo)
    );
    return ok(res, result);
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

/**
 * GET /api/wearables/alerts
 * Retrieve user's clinical alerts generated by wearable biometrics
 */
async function getAlerts(req, res) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return ok(res, []);
    const alerts = await prisma.wearableAlert.findMany({
      where: { userId, isDismissed: false },
      orderBy: { triggeredAt: 'desc' },
      take: 20
    });
    return ok(res, alerts);
  } catch (err) {
    return fail(res, 500, err.message);
  }
}

/**
 * POST /api/wearables/alerts/:id/dismiss
 * Dismiss an alert
 */
async function dismissAlert(req, res) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return fail(res, 401, 'User account required.');
    const alertId = req.params.id;

    await prisma.wearableAlert.updateMany({
      where: { id: alertId, userId },
      data: { isDismissed: true, isRead: true }
    });

    return ok(res, { success: true, message: 'Alert dismissed.' });
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

module.exports = {
  getProviders,
  getStatus,
  connect,
  sync,
  generateDemoData,
  getLatest,
  getHistory,
  getDailySummary,
  disconnect,
  revoke,
  getAlerts,
  dismissAlert
};
