'use strict';

/**
 * AnomalyDetector — Clinical anomaly and pattern detection based on AHA, WHO, and ACOG standards.
 * Detects tachycardia, bradycardia, hypoxia, sleep debt, hypertensive crisis, etc.
 */
class AnomalyDetector {
  /**
   * Evaluates biometrics in healthProfile and returns list of verified abnormalities.
   * @param {object} healthProfile
   * @returns {Array<object>}
   */
  static detectAbnormalities(healthProfile) {
    if (!healthProfile || !healthProfile.metrics) return [];
    const abnormalities = [];
    const m = healthProfile.metrics;

    // 1. Heart Rate evaluation
    if (m.HEART_RATE) {
      const hr = m.HEART_RATE.value;
      if (hr >= 140) {
        abnormalities.push({
          metric: 'HEART_RATE',
          severity: 'CRITICAL',
          type: 'ACUTE_TACHYCARDIA',
          title: 'Acute Resting Tachycardia (HR >= 140 BPM)',
          detail: `Heart rate recorded at ${hr} BPM at rest. Exceeds standard safe baseline.`,
          recommendation: 'Rest quietly, stay seated, and seek immediate clinical care if experiencing dizziness, chest tightness, or shortness of breath.',
          observedValue: `${hr} BPM`,
          baselineRange: '60–100 BPM'
        });
      } else if (hr >= 105) {
        abnormalities.push({
          metric: 'HEART_RATE',
          severity: 'WARNING',
          type: 'ELEVATED_HEART_RATE',
          title: 'Elevated Resting Heart Rate (HR >= 105 BPM)',
          detail: `Heart rate recorded at ${hr} BPM. May indicate acute stress, dehydration, caffeine, fever, or physical exertion.`,
          recommendation: 'Hydrate, sit quietly for 5–10 minutes, practice deep breathing, and monitor for persistent elevation.',
          observedValue: `${hr} BPM`,
          baselineRange: '60–100 BPM'
        });
      } else if (hr < 48) {
        abnormalities.push({
          metric: 'HEART_RATE',
          severity: 'WARNING',
          type: 'BRADYCARDIA',
          title: 'Low Resting Heart Rate (HR < 48 BPM)',
          detail: `Heart rate recorded at ${hr} BPM. Common in endurance athletes or deep rest, but monitor for symptoms.`,
          recommendation: 'Ensure you do not feel faint or dizzy when standing.',
          observedValue: `${hr} BPM`,
          baselineRange: '60–100 BPM'
        });
      }
    }

    // 2. Blood Oxygen (SpO2) evaluation
    if (m.SPO2) {
      const sp = m.SPO2.value;
      if (sp < 90) {
        abnormalities.push({
          metric: 'SPO2',
          severity: 'CRITICAL',
          type: 'CRITICAL_HYPOXIA',
          title: 'Critical Oxygen Saturation (SpO2 < 90%)',
          detail: `Blood oxygen saturation recorded at ${sp}%. Below clinical normal limits.`,
          recommendation: 'Seek urgent clinical evaluation immediately if feeling short of breath or lightheaded (call 112 if in distress).',
          observedValue: `${sp}%`,
          baselineRange: '95%–100%'
        });
      } else if (sp < 94) {
        abnormalities.push({
          metric: 'SPO2',
          severity: 'WARNING',
          type: 'LOW_SPO2',
          title: 'Suboptimal Oxygen Saturation (SpO2 < 94%)',
          detail: `Blood oxygen recorded at ${sp}%. Optimal range is 95%–100%.`,
          recommendation: 'Ensure sensor is snug against warm skin, sit upright, and take slow diaphragmatic breaths.',
          observedValue: `${sp}%`,
          baselineRange: '95%–100%'
        });
      }
    }

    // 3. Sleep Shortage evaluation
    if (m.SLEEP_DURATION) {
      const sl = m.SLEEP_DURATION.value;
      if (sl < 5.0) {
        abnormalities.push({
          metric: 'SLEEP_DURATION',
          severity: 'INFO',
          type: 'ACUTE_SLEEP_DEBT',
          title: 'Acute Sleep Shortage (< 5 Hours)',
          detail: `Recorded sleep duration of ${sl.toFixed(1)} hours. Insufficient restorative rest.`,
          recommendation: 'Prioritize an early bedtime tonight to stabilize hormonal balance and cardiovascular recovery.',
          observedValue: `${sl.toFixed(1)} hrs`,
          baselineRange: '7.0–9.0 hrs'
        });
      }
    }

    // 4. Blood Pressure evaluation
    if (m.BLOOD_PRESSURE) {
      const s = m.BLOOD_PRESSURE.systolic;
      const d = m.BLOOD_PRESSURE.diastolic;
      if (s >= 180 || d >= 120) {
        abnormalities.push({
          metric: 'BLOOD_PRESSURE',
          severity: 'CRITICAL',
          type: 'HYPERTENSIVE_CRISIS',
          title: 'Hypertensive Crisis Threshold (BP >= 180/120 mmHg)',
          detail: `Blood pressure reading: ${s}/${d} mmHg.`,
          recommendation: 'Immediate emergency medical consultation required (call 112 if experiencing chest pain, headache, or visual disturbance).',
          observedValue: `${s}/${d} mmHg`,
          baselineRange: '< 120/80 mmHg'
        });
      } else if (s >= 140 || d >= 90) {
        abnormalities.push({
          metric: 'BLOOD_PRESSURE',
          severity: 'WARNING',
          type: 'STAGE_2_HYPERTENSION',
          title: 'Stage 2 Hypertension Range (BP >= 140/90 mmHg)',
          detail: `Blood pressure reading: ${s}/${d} mmHg.`,
          recommendation: 'Consult your physician for cardiovascular evaluation and lifestyle/medication review.',
          observedValue: `${s}/${d} mmHg`,
          baselineRange: '< 120/80 mmHg'
        });
      }
    }

    return abnormalities;
  }
}

module.exports = AnomalyDetector;
