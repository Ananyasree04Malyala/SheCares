'use strict';

const HealthDataService = require('./HealthDataService');
const AnomalyDetector = require('./AnomalyDetector');
const prisma = require('../config/db');

class HealthAnalytics {
  /**
   * Generates a complete health analytics summary for a user.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  static async getAnalytics(userId) {
    const profile = await HealthDataService.getUserHealthMetrics(userId);
    if (!profile) return null;

    const abnormalities = AnomalyDetector.detectAbnormalities(profile);

    return {
      userId,
      metrics: profile.metrics,
      abnormalities,
      recentFitness: profile.recentFitness,
      activeAlerts: profile.activeAlerts,
      hasData: profile.hasData,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Evaluates biometrics and triggers persistent alert records when critical abnormalities appear.
   * Includes deduplication window of 2 hours.
   */
  static async evaluateAndNotify(userId) {
    if (!userId) return [];
    const analytics = await this.getAnalytics(userId);
    if (!analytics || !analytics.abnormalities || analytics.abnormalities.length === 0) return [];

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const createdAlerts = [];

    for (const ab of analytics.abnormalities) {
      try {
        const existingAlert = await prisma.wearableAlert.findFirst({
          where: {
            userId,
            alertType: ab.type,
            triggeredAt: { gte: twoHoursAgo }
          }
        });

        if (!existingAlert) {
          const newAlert = await prisma.wearableAlert.create({
            data: {
              userId,
              alertType: ab.type,
              severity: ab.severity,
              title: ab.title,
              message: `${ab.detail} Recommendation: ${ab.recommendation}`,
              metricType: ab.metric,
              value: ab.observedValue ? parseFloat(ab.observedValue) : null,
              threshold: null,
              triggeredAt: new Date()
            }
          });
          createdAlerts.push(newAlert);
        }
      } catch (err) {
        console.warn('[HealthAnalytics] Alert creation failed:', err.message);
      }
    }

    return createdAlerts;
  }
}

module.exports = HealthAnalytics;
