/**
 * SheCare Wearables Production Synchronization Engine
 * 
 * Implements a strict, idempotent 12-step synchronization pipeline:
 * 1. Identify authorized user
 * 2. Validate wearable authorization & status
 * 3. Retrieve provider instance
 * 4. Determine delta range
 * 5. Normalize units & validate physiological bounds
 * 6. Generate SHA-256 deduplication hash
 * 7. Deduplicate existing records in PostgreSQL
 * 8. Insert new unique readings
 * 9. Recompute daily summaries (aggregates)
 * 10. Run clinical alert engine
 * 11. Broadcast real-time SSE telemetry
 * 12. Record audit log and return synchronization stats
 */

'use strict';

const prisma = require('../../config/db');
const realtime = require('../realtimeService');
const { getProvider } = require('./providerRegistry');
const BaseWearableProvider = require('./baseWearableProvider');
const WearableAlertEngine = require('./wearableAlertEngine');

class WearableSyncService {
  /**
   * Connect or update a user's wearable connection
   */
  static async connectWearable({ userId, provider, deviceName, deviceModel, platformOs, permittedMetrics, isDemo = false, metadata = null }) {
    if (!userId) throw new Error('User ID is required');
    const pInstance = getProvider(provider);
    const validMetrics = pInstance.validatePermissions(permittedMetrics);

    if (validMetrics.length === 0 && !isDemo) {
      throw new Error('At least one valid health metric permission must be granted.');
    }

    // Map GOOGLE_FIT and NOISE_FIT to database enum
    const dbProvider = (provider === 'GOOGLE_FIT' || provider === 'google_fit') ? 'ANDROID_HEALTH_CONNECT' : (provider === 'NOISE_FIT' ? 'WEAR_OS' : provider);

    const connection = await prisma.wearableConnection.upsert({
      where: {
        userId_provider_isDemo: {
          userId,
          provider: dbProvider,
          isDemo: Boolean(isDemo)
        }
      },
      update: {
        status: 'CONNECTED',
        deviceName: deviceName || pInstance.name,
        deviceModel: deviceModel || null,
        platformOs: platformOs || null,
        permittedMetrics: validMetrics,
        errorMessage: null,
        metadata: metadata || undefined,
        updatedAt: new Date()
      },
      create: {
        userId,
        provider: dbProvider,
        deviceName: deviceName || pInstance.name,
        deviceModel: deviceModel || null,
        platformOs: platformOs || null,
        status: 'CONNECTED',
        permittedMetrics: validMetrics,
        isDemo: Boolean(isDemo),
        metadata: metadata || undefined
      }
    });

    return connection;
  }

  /**
   * Ingest and synchronize wearable health samples
   * Idempotent: safe to retry repeatedly without duplicate records
   */
  static async syncWearableData({ userId, provider, samples = [], isDemo = false }) {
    const startTime = Date.now();
    if (!userId) throw new Error('Unauthorized: User ID missing');

    const pInstance = getProvider(provider);
    const dbProvider = (provider === 'GOOGLE_FIT' || provider === 'google_fit') ? 'ANDROID_HEALTH_CONNECT' : (provider === 'NOISE_FIT' ? 'WEAR_OS' : provider);

    // 1. Check or load connection
    let connection = await prisma.wearableConnection.findUnique({
      where: {
        userId_provider_isDemo: {
          userId,
          provider: dbProvider,
          isDemo: Boolean(isDemo)
        }
      }
    });

    if (!connection) {
      // Auto-register connection if valid
      connection = await this.connectWearable({
        userId,
        provider,
        permittedMetrics: pInstance.getSupportedMetrics(),
        isDemo
      });
    }

    if (connection.status === 'DISCONNECTED') {
      throw new Error('This wearable has been disconnected. Reconnect in Settings to sync data.');
    }

    // Update connection status to SYNCHRONIZING
    await prisma.wearableConnection.update({
      where: { id: connection.id },
      data: { status: 'SYNCHRONIZING' }
    });

    let recordsReceived = samples.length;
    let newRecordsInserted = 0;
    let duplicatesSkipped = 0;
    const insertedReadings = [];

    try {
      if (samples.length > 0) {
        // 2. Normalize and validate physiological bounds
        const normalized = [];
        const hashes = [];

        for (const raw of samples) {
          const norm = pInstance.normalizeSample(raw);
          if (!norm) continue;

          // Check if metric is permitted by user
          if (connection.permittedMetrics.length > 0 && !connection.permittedMetrics.includes(norm.metricType)) {
            continue; // Skip non-permitted metric
          }

          const recordHash = BaseWearableProvider.generateRecordHash(
            userId,
            norm.metricType,
            norm.timestamp,
            norm.value
          );

          normalized.push({
            ...norm,
            recordHash,
            userId,
            connectionId: connection.id,
            isDemo: Boolean(isDemo)
          });
          hashes.push(recordHash);
        }

        // 3. Batch check existing hashes to guarantee zero duplicates
        const existingRecords = await prisma.wearableReading.findMany({
          where: {
            userId,
            recordHash: { in: hashes }
          },
          select: { recordHash: true }
        });
        const existingHashSet = new Set(existingRecords.map(r => r.recordHash));

        const uniqueToInsert = [];
        const seenInBatch = new Set();

        for (const item of normalized) {
          if (!existingHashSet.has(item.recordHash) && !seenInBatch.has(item.recordHash)) {
            uniqueToInsert.push(item);
            seenInBatch.add(item.recordHash);
          } else {
            duplicatesSkipped++;
          }
        }

        // 4. Insert new unique readings
        if (uniqueToInsert.length > 0) {
          for (const item of uniqueToInsert) {
            const created = await prisma.wearableReading.create({
              data: {
                userId: item.userId,
                connectionId: item.connectionId,
                metricType: item.metricType,
                value: item.value,
                unit: item.unit,
                timestamp: item.timestamp,
                source: item.source,
                deviceName: item.deviceName,
                recordHash: item.recordHash,
                isDemo: item.isDemo,
                metadata: item.metadata || undefined
              }
            });
            insertedReadings.push(created);
          }
          newRecordsInserted = uniqueToInsert.length;
        }

        // 5. Update Daily Summaries for affected dates
        if (insertedReadings.length > 0) {
          await this.recalculateDailySummaries(userId, connection.id, insertedReadings, isDemo);
        }

        // 6. Clinical Alert Rules Engine
        if (insertedReadings.length > 0 && !isDemo) {
          await WearableAlertEngine.evaluateReadings(userId, insertedReadings);
        }
      }

      const syncDurationMs = Date.now() - startTime;
      const now = new Date();

      // 7. Update connection status to CONNECTED & timestamp with real deviceName
      let dynamicDeviceName = connection.deviceName;
      if (samples.length > 0) {
        const namedSample = samples.find(s => (s.device || s.deviceName) && (s.device || s.deviceName) !== 'Android Health Connect' && (s.device || s.deviceName) !== 'Smartwatch');
        if (namedSample) {
          dynamicDeviceName = namedSample.device || namedSample.deviceName;
        }
      }

      await prisma.wearableConnection.update({
        where: { id: connection.id },
        data: {
          status: 'CONNECTED',
          deviceName: dynamicDeviceName,
          lastSyncAt: now,
          lastSuccessfulSyncAt: now,
          errorMessage: null
        }
      });

      // 8. Record audit sync log
      await prisma.wearableSyncLog.create({
        data: {
          userId,
          connectionId: connection.id,
          provider: dbProvider,
          recordsReceived,
          newRecordsInserted,
          duplicatesSkipped,
          syncDurationMs,
          status: 'SUCCESS',
          isDemo: Boolean(isDemo)
        }
      });

      // 9. Fetch latest values to return in sync response and broadcast
      const latestMetrics = await this.getLatestMetrics(userId, isDemo);

      // 10. Broadcast via Real-Time SSE to active browser windows (0ms latency)
      try {
        realtime.broadcast('wearable_sync', {
          provider,
          isDemo: Boolean(isDemo),
          metrics: latestMetrics,
          lastSync: now.toISOString()
        }, userId);
      } catch {}

      return {
        status: 'success',
        provider,
        isDemo: Boolean(isDemo),
        recordsReceived,
        newRecordsInserted,
        inserted: newRecordsInserted,
        duplicatesSkipped,
        duplicates: duplicatesSkipped,
        syncDurationMs,
        lastSync: now.toISOString(),
        metrics: latestMetrics
      };
    } catch (err) {
      await prisma.wearableConnection.update({
        where: { id: connection.id },
        data: {
          status: 'ERROR',
          errorMessage: err.message,
          lastSyncAt: new Date()
        }
      });

      await prisma.wearableSyncLog.create({
        data: {
          userId,
          connectionId: connection.id,
          provider: dbProvider,
          recordsReceived,
          newRecordsInserted,
          duplicatesSkipped,
          syncDurationMs: Date.now() - startTime,
          status: 'FAILED',
          errorMessage: err.message,
          isDemo: Boolean(isDemo)
        }
      });

      throw err;
    }
  }

  /**
   * Recalculate daily aggregate summaries (steps, min/max/avg HR, sleep, SpO2)
   */
  static async recalculateDailySummaries(userId, connectionId, readings, isDemo = false) {
    const dates = new Set(readings.map(r => {
      const d = new Date(r.timestamp);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
    }));

    for (const dateIso of dates) {
      const dayStart = new Date(dateIso);
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const dayReadings = await prisma.wearableReading.findMany({
        where: {
          userId,
          isDemo: Boolean(isDemo),
          timestamp: { gte: dayStart, lt: dayEnd }
        }
      });

      if (dayReadings.length === 0) continue;

      let stepsTotal = 0;
      let distanceMeters = 0;
      let caloriesBurned = 0;
      let hrValues = [];
      let restingHr = null;
      let hrvValues = [];
      let spo2Values = [];
      let sleepHours = null;
      let tempValues = [];

      for (const r of dayReadings) {
        if (r.metricType === 'STEPS') stepsTotal = Math.max(stepsTotal, Math.round(r.value));
        else if (r.metricType === 'DISTANCE') distanceMeters = Math.max(distanceMeters, r.value);
        else if (r.metricType === 'CALORIES_ACTIVE' || r.metricType === 'CALORIES_TOTAL') caloriesBurned = Math.max(caloriesBurned, Math.round(r.value));
        else if (r.metricType === 'HEART_RATE') hrValues.push(r.value);
        else if (r.metricType === 'RESTING_HEART_RATE') restingHr = r.value;
        else if (r.metricType === 'HRV') hrvValues.push(r.value);
        else if (r.metricType === 'SPO2') spo2Values.push(r.value);
        else if (r.metricType === 'SLEEP_DURATION') sleepHours = Math.max(sleepHours || 0, r.value);
        else if (r.metricType === 'SKIN_TEMPERATURE') tempValues.push(r.value);
      }

      const avg = arr => arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;

      await prisma.wearableDailySummary.upsert({
        where: {
          userId_date_isDemo: {
            userId,
            date: dayStart,
            isDemo: Boolean(isDemo)
          }
        },
        update: {
          stepsTotal: stepsTotal || undefined,
          distanceMeters: distanceMeters || undefined,
          caloriesBurned: caloriesBurned || undefined,
          avgHeartRate: avg(hrValues),
          minHeartRate: hrValues.length ? Math.min(...hrValues) : undefined,
          maxHeartRate: hrValues.length ? Math.max(...hrValues) : undefined,
          restingHeartRate: restingHr || undefined,
          avgHrv: avg(hrvValues),
          avgSpo2: avg(spo2Values),
          sleepHours: sleepHours || undefined,
          avgSkinTemp: avg(tempValues),
          updatedAt: new Date()
        },
        create: {
          userId,
          connectionId,
          date: dayStart,
          isDemo: Boolean(isDemo),
          stepsTotal,
          distanceMeters,
          caloriesBurned,
          avgHeartRate: avg(hrValues),
          minHeartRate: hrValues.length ? Math.min(...hrValues) : null,
          maxHeartRate: hrValues.length ? Math.max(...hrValues) : null,
          restingHeartRate: restingHr,
          avgHrv: avg(hrvValues),
          avgSpo2: avg(spo2Values),
          sleepHours,
          avgSkinTemp: avg(tempValues)
        }
      });
    }
  }

  /**
   * Retrieve latest recorded value for each metric
   */
  static async getLatestMetrics(userId, isDemo = false) {
    const metricTypes = [
      'HEART_RATE', 'RESTING_HEART_RATE', 'HRV', 'SPO2', 'SKIN_TEMPERATURE',
      'STEPS', 'DISTANCE', 'CALORIES_ACTIVE', 'SLEEP_DURATION',
      'BLOOD_PRESSURE_SYSTOLIC', 'BLOOD_PRESSURE_DIASTOLIC'
    ];

    const results = {};

    for (const mt of metricTypes) {
      const latest = await prisma.wearableReading.findFirst({
        where: {
          userId,
          metricType: mt,
          isDemo: Boolean(isDemo)
        },
        orderBy: { timestamp: 'desc' }
      });

      if (latest) {
        results[mt] = {
          value: latest.value,
          unit: latest.unit,
          timestamp: latest.timestamp,
          source: latest.source,
          deviceName: latest.deviceName,
          isDemo: latest.isDemo
        };
      } else {
        results[mt] = null;
      }
    }

    return results;
  }

  /**
   * Disconnect a wearable provider and mark status
   */
  static async disconnectWearable(userId, provider, isDemo = false) {
    const dbProvider = (provider === 'GOOGLE_FIT' || provider === 'google_fit') ? 'ANDROID_HEALTH_CONNECT' : (provider === 'NOISE_FIT' ? 'WEAR_OS' : provider);
    const connection = await prisma.wearableConnection.findUnique({
      where: {
        userId_provider_isDemo: {
          userId,
          provider: dbProvider,
          isDemo: Boolean(isDemo)
        }
      }
    });

    if (!connection) throw new Error('Connection not found');

    await prisma.wearableConnection.update({
      where: { id: connection.id },
      data: {
        status: 'DISCONNECTED',
        errorMessage: 'Disconnected by user'
      }
    });

    return { success: true, message: `${provider} successfully disconnected.` };
  }

  /**
   * Revoke permission and optionally purge synchronized health readings
   */
  static async revokeAuthorization(userId, provider, purgeData = false, isDemo = false) {
    const dbProvider = (provider === 'GOOGLE_FIT' || provider === 'google_fit') ? 'ANDROID_HEALTH_CONNECT' : (provider === 'NOISE_FIT' ? 'WEAR_OS' : provider);
    const connection = await prisma.wearableConnection.findUnique({
      where: {
        userId_provider_isDemo: {
          userId,
          provider: dbProvider,
          isDemo: Boolean(isDemo)
        }
      }
    });

    if (connection) {
      if (purgeData) {
        await prisma.wearableReading.deleteMany({
          where: { userId, connectionId: connection.id }
        });
        await prisma.wearableDailySummary.deleteMany({
          where: { userId, connectionId: connection.id }
        });
      }
      await prisma.wearableConnection.delete({
        where: { id: connection.id }
      });
    }

    return { success: true, message: `Authorization for ${provider} revoked and data removed.` };
  }
}

module.exports = WearableSyncService;
