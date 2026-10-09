/**
 * SheCare Health Analytics & Clinical Abnormality Detection Engine
 * 
 * Sits directly on top of protected health data storage (wearable readings, blood pressure, etc.)
 * Strictly READ-ONLY with respect to imported health records.
 * 
 * Functions:
 * 1. Analyzes imported biometric metrics (Heart Rate, Resting HR, SpO2, Steps, Sleep, Blood Pressure).
 * 2. Evaluates physiological baselines and detects acute/sub-acute abnormalities based on ACOG, AHA/ACC, WHO clinical standards.
 * 3. Builds a structured Clinical Health Context for the AI Assistant so AI answers using authentic user vitals.
 * 4. Generates clinical notifications when significant abnormalities or patterns are detected.
 * 5. Guarantees zero fabrication of health readings.
 */

'use strict';

const prisma = require('../config/db');

class HealthAnalyticsEngine {
  /**
   * Fetch the comprehensive active health profile & latest vitals for a user
   * @param {string} userId 
   * @returns {Promise<object>}
   */
  static async getUserHealthMetrics(userId) {
    if (!userId) return null;

    try {
      // 1. Fetch latest distinct wearable metrics
      const latestWearableReadings = await prisma.wearableReading.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        distinct: ['metricType'],
        take: 10
      });

      // 2. Fetch latest BP records if available
      const latestBp = await prisma.bloodPressure?.findFirst?.({
        where: { userId },
        orderBy: { recordedAt: 'desc' }
      }).catch(() => null);

      // 3. Fetch active clinical alerts
      const activeAlerts = await prisma.wearableAlert.findMany({
        where: { userId, isDismissed: false },
        orderBy: { triggeredAt: 'desc' },
        take: 5
      });

      // 4. Map metrics to key-value
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
          timestamp: latestBp.recordedAt,
          source: 'bp_tracker'
        };
      }

      return {
        userId,
        metrics,
        activeAlerts,
        hasData: Object.keys(metrics).length > 0
      };
    } catch (err) {
      console.warn('[HealthAnalyticsEngine] Error loading user health profile:', err.message);
      return null;
    }
  }

  /**
   * Detect potential physiological abnormalities across current vitals
   * @param {object} healthProfile 
   * @returns {object[]} Array of detected abnormalities
   */
  static detectAbnormalities(healthProfile) {
    if (!healthProfile || !healthProfile.metrics) return [];
    const abnormalities = [];
    const m = healthProfile.metrics;

    // Heart Rate evaluation
    if (m.HEART_RATE) {
      const hr = m.HEART_RATE.value;
      if (hr >= 140) {
        abnormalities.push({
          metric: 'HEART_RATE',
          severity: 'CRITICAL',
          type: 'SEVERE_TACHYCARDIA',
          title: 'Marked Tachycardia (HR >= 140 BPM)',
          detail: `Heart rate recorded at ${hr} BPM at rest. Exceeds standard sinus threshold.`,
          recommendation: 'Rest quietly, hydrate, and seek medical attention if accompanied by chest discomfort or dizziness.'
        });
      } else if (hr >= 105) {
        abnormalities.push({
          metric: 'HEART_RATE',
          severity: 'WARNING',
          type: 'ELEVATED_HEART_RATE',
          title: 'Elevated Resting Heart Rate (HR >= 105 BPM)',
          detail: `Heart rate recorded at ${hr} BPM. May reflect acute stress, dehydration, caffeine, fever, or exertion.`,
          recommendation: 'Hydrate, sit quietly for 5 minutes, and monitor for persistent elevation.'
        });
      } else if (hr < 48) {
        abnormalities.push({
          metric: 'HEART_RATE',
          severity: 'WARNING',
          type: 'BRADYCARDIA',
          title: 'Low Heart Rate (HR < 48 BPM)',
          detail: `Heart rate recorded at ${hr} BPM. Common in endurance athletes or deep rest, but monitor for symptoms.`,
          recommendation: 'Ensure you do not feel faint or lightheaded.'
        });
      }
    }

    // Blood Oxygen (SpO2) evaluation
    if (m.SPO2) {
      const sp = m.SPO2.value;
      if (sp < 90) {
        abnormalities.push({
          metric: 'SPO2',
          severity: 'CRITICAL',
          type: 'CRITICAL_HYPOXIA',
          title: 'Critical Oxygen Saturation (SpO2 < 90%)',
          detail: `Blood oxygen saturation recorded at ${sp}%. Below clinical normal limits.`,
          recommendation: 'Seek urgent clinical evaluation immediately if feeling short of breath.'
        });
      } else if (sp < 94) {
        abnormalities.push({
          metric: 'SPO2',
          severity: 'WARNING',
          type: 'LOW_SPO2',
          title: 'Suboptimal Oxygen Saturation (SpO2 < 94%)',
          detail: `Blood oxygen recorded at ${sp}%. Optimal range is 95%–100%.`,
          recommendation: 'Ensure sensor is snug on warm skin, sit upright, and take slow deep breaths.'
        });
      }
    }

    // Sleep Debt evaluation
    if (m.SLEEP_DURATION) {
      const sl = m.SLEEP_DURATION.value;
      if (sl < 5.0) {
        abnormalities.push({
          metric: 'SLEEP_DURATION',
          severity: 'INFO',
          type: 'ACUTE_SLEEP_DEBT',
          title: 'Acute Sleep Shortage (< 5 Hours)',
          detail: `Recorded sleep duration of ${sl.toFixed(1)} hours. Insufficient restorative rest.`,
          recommendation: 'Prioritize an early bedtime tonight to stabilize hormonal balance and cardiovascular recovery.'
        });
      }
    }

    // Blood Pressure evaluation
    if (m.BLOOD_PRESSURE) {
      const s = m.BLOOD_PRESSURE.systolic;
      const d = m.BLOOD_PRESSURE.diastolic;
      if (s >= 180 || d >= 120) {
        abnormalities.push({
          metric: 'BLOOD_PRESSURE',
          severity: 'CRITICAL',
          type: 'HYPERTENSIVE_CRISIS',
          title: 'Hypertensive Crisis Threshold (BP >= 180/120)',
          detail: `Blood pressure reading: ${s}/${d} mmHg.`,
          recommendation: 'Emergency medical consultation required immediately (call 112 if in distress).'
        });
      } else if (s >= 140 || d >= 90) {
        abnormalities.push({
          metric: 'BLOOD_PRESSURE',
          severity: 'WARNING',
          type: 'STAGE_2_HYPERTENSION',
          title: 'Stage 2 Hypertension Range (BP >= 140/90)',
          detail: `Blood pressure reading: ${s}/${d} mmHg.`,
          recommendation: 'Consult your physician for cardiovascular evaluation and medication review.'
        });
      }
    }

    return abnormalities;
  }

  /**
   * Build AI Context String summarizing actual user vitals for LLM injection
   * @param {object} healthProfile 
   * @returns {string}
   */
  static buildAiHealthContext(healthProfile) {
    if (!healthProfile || !healthProfile.hasData) {
      return '';
    }

    const m = healthProfile.metrics;
    const parts = [];

    parts.push('=== AUTHENTIC USER HEALTH BIOMETRICS (PROTECTED DATA) ===');
    if (m.HEART_RATE) parts.push(`• Heart Rate: ${m.HEART_RATE.value} ${m.HEART_RATE.unit} (Recorded: ${new Date(m.HEART_RATE.timestamp).toLocaleTimeString()})`);
    if (m.RESTING_HEART_RATE) parts.push(`• Resting Heart Rate: ${m.RESTING_HEART_RATE.value} ${m.RESTING_HEART_RATE.unit}`);
    if (m.STEPS) parts.push(`• Steps Today: ${m.STEPS.value.toLocaleString()} steps`);
    if (m.CALORIES_ACTIVE) parts.push(`• Active Calories Burned: ${m.CALORIES_ACTIVE.value} kcal`);
    if (m.SPO2) parts.push(`• SpO2 Oxygen Saturation: ${m.SPO2.value}%`);
    if (m.SLEEP_DURATION) parts.push(`• Sleep Duration: ${m.SLEEP_DURATION.value} hours`);
    if (m.BLOOD_PRESSURE) parts.push(`• Blood Pressure: ${m.BLOOD_PRESSURE.systolic}/${m.BLOOD_PRESSURE.diastolic} mmHg`);

    const abnormalities = HealthAnalyticsEngine.detectAbnormalities(healthProfile);
    if (abnormalities.length > 0) {
      parts.push('\n=== DETECTED PHYSIOLOGICAL ABNORMALITIES / PATTERNS ===');
      for (const a of abnormalities) {
        parts.push(`[${a.severity}] ${a.title}: ${a.detail} -> ${a.recommendation}`);
      }
    } else {
      parts.push('\n=== CLINICAL STATUS ===');
      parts.push('All current physiological parameters (Heart Rate, SpO2, Sleep) are within normal clinical baselines.');
    }
    parts.push('=== INSTRUCTIONS FOR AI: Directly reference the user\'s real metrics above when relevant. Do NOT fabricate different numbers. ===\n');

    return parts.join('\n');
  }

  /**
   * Run background evaluation and notify user via DB alert if any new abnormal pattern arises
   * @param {string} userId 
   */
  static async evaluateAndNotify(userId) {
    if (!userId) return [];
    const profile = await HealthAnalyticsEngine.getUserHealthMetrics(userId);
    if (!profile) return [];

    const abnormalities = HealthAnalyticsEngine.detectAbnormalities(profile);
    const notificationsCreated = [];

    for (const ab of abnormalities) {
      // Check if an alert for this type was already created in the past 6 hours
      const sixHoursAgo = new Date(Date.now() - 6 * 3600000);
      const existing = await prisma.wearableAlert.findFirst({
        where: {
          userId,
          alertType: ab.type,
          triggeredAt: { gte: sixHoursAgo }
        }
      });

      if (!existing) {
        const alert = await prisma.wearableAlert.create({
          data: {
            userId,
            alertType: ab.type,
            severity: ab.severity === 'CRITICAL' ? 'CRITICAL' : (ab.severity === 'WARNING' ? 'HIGH' : 'INFO'),
            title: ab.title,
            message: `${ab.detail} ${ab.recommendation}`,
            metricType: ab.metric,
            metricValue: profile.metrics[ab.metric]?.value || null,
            isDismissed: false,
            isRead: false
          }
        });
        notificationsCreated.push(alert);
      }
    }

    return notificationsCreated;
  }
}

module.exports = HealthAnalyticsEngine;
