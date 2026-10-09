'use strict';

/**
 * HealthDataService — Retrieves authentic user health metrics safely with zero hallucination.
 * Queries distinct wearable biometrics, blood pressure, glucose, activity, and sleep.
 */
const prisma = require('../config/db');

class HealthDataService {
  /**
   * Retrieves relevant health records for the user based on specific requested categories
   * or a general full profile.
   * @param {string} userId
   * @param {string[]} [requestedCategories] - e.g. ['heart_rate', 'sleep', 'steps', 'bp']
   */
  static async getUserHealthMetrics(userId, requestedCategories = null) {
    if (!userId) return null;

    try {
      // 1. Fetch latest distinct wearable metrics
      const latestWearableReadings = await prisma.wearableReading.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        distinct: ['metricType'],
        take: 15
      });

      // 2. Fetch latest Blood Pressure record
      const latestBp = await prisma.bloodPressureRecord?.findFirst?.({
        where: { userId },
        orderBy: { recordedAt: 'desc' }
      }).catch(() => null);

      // 3. Fetch latest Glucose record
      const latestGlucose = await prisma.glucoseRecord?.findFirst?.({
        where: { userId },
        orderBy: { recordedAt: 'desc' }
      }).catch(() => null);

      // 4. Fetch recent fitness/yoga records
      const latestFitness = await prisma.fitnessRecord?.findMany?.({
        where: { userId },
        orderBy: { recordedAt: 'desc' },
        take: 3
      }).catch(() => []);

      // 5. Fetch active wearable alerts
      const activeAlerts = await prisma.wearableAlert.findMany({
        where: { userId, isDismissed: false },
        orderBy: { triggeredAt: 'desc' },
        take: 5
      }).catch(() => []);

      const metrics = {};
      for (const r of latestWearableReadings) {
        metrics[r.metricType] = {
          value: Number(r.value),
          unit: r.unit,
          timestamp: r.timestamp,
          source: r.source,
          deviceName: r.deviceName,
          isDemo: Boolean(r.isDemo)
        };
      }

      if (latestBp) {
        metrics['BLOOD_PRESSURE'] = {
          systolic: latestBp.systolic,
          diastolic: latestBp.diastolic,
          pulse: latestBp.pulse,
          timestamp: latestBp.recordedAt,
          source: 'bp_record'
        };
      }

      if (latestGlucose) {
        metrics['GLUCOSE'] = {
          value: latestGlucose.value,
          readingType: latestGlucose.readingType,
          timestamp: latestGlucose.recordedAt,
          source: 'glucose_record'
        };
      }

      return {
        userId,
        metrics,
        recentFitness: latestFitness,
        activeAlerts,
        hasData: Object.keys(metrics).length > 0 || (latestFitness && latestFitness.length > 0)
      };
    } catch (err) {
      console.warn('[HealthDataService] Error querying user health metrics:', err.message);
      return null;
    }
  }

  /**
   * Determine whether a specific metric exists for the user
   */
  static hasMetric(profile, metricKey) {
    if (!profile || !profile.metrics) return false;
    return !!profile.metrics[metricKey.toUpperCase()];
  }
}

module.exports = HealthDataService;
