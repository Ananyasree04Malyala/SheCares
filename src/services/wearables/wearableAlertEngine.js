/**
 * SheCare Wearables Clinical Alert Rules Engine
 * 
 * Evaluates synchronized wearable readings against clinical thresholds
 * (AHA/ACC, WHO, ACOG) to alert users about deviations from normal ranges
 * WITHOUT providing unsupported diagnoses.
 */

'use strict';

const prisma = require('../../config/db');

class WearableAlertEngine {
  /**
   * Evaluate an array of newly inserted readings for a user
   * @param {string} userId
   * @param {object[]} readings
   * @returns {Promise<object[]>} Created alerts
   */
  static async evaluateReadings(userId, readings = []) {
    if (!userId || !readings || readings.length === 0) return [];
    const generatedAlerts = [];

    for (const r of readings) {
      if (r.isDemo) continue; // Do not trigger real user alerts on demo data
      const val = Number(r.value);

      // 1. Extreme Resting / Peak Heart Rate
      if (r.metricType === 'HEART_RATE') {
        if (val >= 140) {
          generatedAlerts.push({
            userId,
            alertType: 'HIGH_HR',
            severity: 'HIGH',
            title: 'Elevated Heart Rate (> 140 BPM)',
            message: `Your connected wearable recorded a pulse of ${val} BPM. If you are currently resting, sit quietly, drink water, and practice paced breathing. Seek medical advice if you experience chest pain, shortness of breath, or dizziness.`,
            metricType: 'HEART_RATE',
            metricValue: val
          });
        } else if (val < 45) {
          generatedAlerts.push({
            userId,
            alertType: 'LOW_HR',
            severity: 'WARNING',
            title: 'Low Pulse (< 45 BPM)',
            message: `Your wearable detected a low pulse rate of ${val} BPM. Common in rested endurance athletes, but consult your physician if you feel faint or fatigued.`,
            metricType: 'HEART_RATE',
            metricValue: val
          });
        }
      }

      // 2. Blood Oxygenation (SpO2)
      if (r.metricType === 'SPO2') {
        if (val < 90) {
          generatedAlerts.push({
            userId,
            alertType: 'LOW_SPO2',
            severity: 'HIGH',
            title: 'Critical Oxygen Saturation (< 90%)',
            message: `Your recorded SpO2 reading of ${val}% is below normal clinical thresholds. Check that your watch is worn snugly on warm skin and re-test. Seek immediate medical attention if you feel breathless.`,
            metricType: 'SPO2',
            metricValue: val
          });
        } else if (val < 94) {
          generatedAlerts.push({
            userId,
            alertType: 'LOW_SPO2',
            severity: 'WARNING',
            title: 'Low Oxygen Saturation (< 94%)',
            message: `Your recorded oxygen level is ${val}%. Ensure you are in a well-ventilated space and re-verify your sensor placement.`,
            metricType: 'SPO2',
            metricValue: val
          });
        }
      }

      // 3. Basal / Skin Temperature
      if (r.metricType === 'SKIN_TEMPERATURE') {
        if (val >= 38.0) {
          generatedAlerts.push({
            userId,
            alertType: 'HIGH_SKIN_TEMP',
            severity: 'WARNING',
            title: 'Elevated Temperature (>= 38.0°C / 100.4°F)',
            message: `Wrist temperature reading shows an elevation to ${val.toFixed(1)}°C. Stay well hydrated, rest, and confirm with an oral thermometer if you feel feverish.`,
            metricType: 'SKIN_TEMPERATURE',
            metricValue: val
          });
        }
      }

      // 4. Sleep Debt Warning
      if (r.metricType === 'SLEEP_DURATION') {
        if (val < 5.0) {
          generatedAlerts.push({
            userId,
            alertType: 'SLEEP_DEBT',
            severity: 'INFO',
            title: 'Short Sleep Recorded (< 5 Hours)',
            message: `Your wearable tracked ${val.toFixed(1)} hours of sleep. Cumulative sleep debt can elevate cortisol and blood pressure. Prioritize restful recovery tonight.`,
            metricType: 'SLEEP_DURATION',
            metricValue: val
          });
        }
      }
    }

    if (generatedAlerts.length === 0) return [];

    // Deduplicate against alerts generated in the past 4 hours
    const recentCutoff = new Date(Date.now() - 4 * 3600000);
    const existing = await prisma.wearableAlert.findMany({
      where: {
        userId,
        triggeredAt: { gte: recentCutoff }
      },
      select: { alertType: true }
    });
    const existingTypes = new Set(existing.map(e => e.alertType));

    const toInsert = generatedAlerts.filter(a => !existingTypes.has(a.alertType));
    if (toInsert.length === 0) return [];

    const created = [];
    for (const a of toInsert) {
      const rec = await prisma.wearableAlert.create({ data: a });
      created.push(rec);
    }
    return created;
  }
}

module.exports = WearableAlertEngine;
