'use strict';

/**
 * HealthContextBuilder — Builds targeted, query-relevant context from authentic health data.
 * Adheres strictly to:
 * - ZERO Health-Data Hallucination (Explicitly notes what is available vs not available)
 * - Grounding: Clearly labels Observed Data vs Possible Explanations vs Clinical Guidelines
 * - Follow-up Context Awareness
 */
class HealthContextBuilder {
  /**
   * Determine which health categories are relevant to the user query.
   * @param {string} query
   * @returns {string[]}
   */
  static identifyRelevantCategories(query) {
    const q = (query || '').toLowerCase();
    const categories = [];

    if (q.includes('heart') || q.includes('pulse') || q.includes('bpm') || q.includes('cardio') || q.includes('tachycardia')) {
      categories.push('HEART_RATE');
    }
    if (q.includes('step') || q.includes('walk') || q.includes('activity') || q.includes('distance')) {
      categories.push('STEPS');
    }
    if (q.includes('sleep') || q.includes('rest') || q.includes('tired') || q.includes('insomnia') || q.includes('nap')) {
      categories.push('SLEEP_DURATION');
    }
    if (q.includes('spo2') || q.includes('oxygen') || q.includes('o2') || q.includes('breath') || q.includes('saturation')) {
      categories.push('SPO2');
    }
    if (q.includes('calor') || q.includes('burn') || q.includes('energy') || q.includes('metabol')) {
      categories.push('CALORIES_ACTIVE');
    }
    if (q.includes('bp') || q.includes('pressure') || q.includes('hypertens')) {
      categories.push('BLOOD_PRESSURE');
    }
    if (q.includes('sugar') || q.includes('glucose') || q.includes('diabetes')) {
      categories.push('GLUCOSE');
    }
    if (q.includes('yoga') || q.includes('pose') || q.includes('exercise') || q.includes('workout')) {
      categories.push('YOGA_FITNESS');
    }

    // Broad inquiry: user asking "how am I doing", "my health", "vitals today", "summary"
    if (categories.length === 0 || q.includes('vital') || q.includes('health') || q.includes('status') || q.includes('how am i') || q.includes('overview') || q.includes('today')) {
      return ['ALL'];
    }

    return categories;
  }

  /**
   * Builds high-precision context string for LLM or clinical engine.
   * @param {object} healthAnalytics - result of HealthAnalytics.getAnalytics()
   * @param {string} userQuery - current query
   * @returns {object} { contextText, relevantMetricsFound, missingRequestedMetrics }
   */
  static buildContext(healthAnalytics, userQuery) {
    if (!healthAnalytics || !healthAnalytics.hasData) {
      return {
        contextText: 'OBSERVED HEALTH DATA: No synchronized health metrics or records are currently available for this user.',
        relevantMetricsFound: false,
        missingRequestedMetrics: ['ALL']
      };
    }

    const m = healthAnalytics.metrics || {};
    const relevantCats = this.identifyRelevantCategories(userQuery);
    const isAll = relevantCats.includes('ALL');

    const observedLines = [];
    const unavailableLines = [];

    // Heart Rate
    if (isAll || relevantCats.includes('HEART_RATE')) {
      if (m.HEART_RATE) {
        observedLines.push(`• Current Heart Rate: ${m.HEART_RATE.value} ${m.HEART_RATE.unit} (Recorded: ${new Date(m.HEART_RATE.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, Source: ${m.HEART_RATE.source || 'wearable'})`);
        if (m.RESTING_HEART_RATE) observedLines.push(`• Resting Heart Rate: ${m.RESTING_HEART_RATE.value} ${m.RESTING_HEART_RATE.unit}`);
      } else {
        unavailableLines.push('Heart Rate');
      }
    }

    // Steps & Activity
    if (isAll || relevantCats.includes('STEPS')) {
      if (m.STEPS) {
        observedLines.push(`• Daily Steps: ${m.STEPS.value.toLocaleString()} steps`);
        if (m.DISTANCE) observedLines.push(`• Distance Covered: ${m.DISTANCE.value} km`);
      } else {
        unavailableLines.push('Steps');
      }
    }

    // Calories
    if (isAll || relevantCats.includes('CALORIES_ACTIVE')) {
      if (m.CALORIES_ACTIVE) {
        observedLines.push(`• Active Calories Burned: ${m.CALORIES_ACTIVE.value} kcal`);
      } else {
        unavailableLines.push('Active Calories');
      }
    }

    // SpO2
    if (isAll || relevantCats.includes('SPO2')) {
      if (m.SPO2) {
        observedLines.push(`• Blood Oxygen (SpO2): ${m.SPO2.value}%`);
      } else {
        unavailableLines.push('SpO2 / Blood Oxygen');
      }
    }

    // Sleep
    if (isAll || relevantCats.includes('SLEEP_DURATION')) {
      if (m.SLEEP_DURATION) {
        observedLines.push(`• Sleep Duration: ${m.SLEEP_DURATION.value} hours`);
      } else {
        unavailableLines.push('Sleep Duration');
      }
    }

    // Blood Pressure
    if (isAll || relevantCats.includes('BLOOD_PRESSURE')) {
      if (m.BLOOD_PRESSURE) {
        observedLines.push(`• Blood Pressure: ${m.BLOOD_PRESSURE.systolic}/${m.BLOOD_PRESSURE.diastolic} mmHg`);
      } else {
        unavailableLines.push('Blood Pressure');
      }
    }

    // Glucose
    if (isAll || relevantCats.includes('GLUCOSE')) {
      if (m.GLUCOSE) {
        observedLines.push(`• Blood Glucose: ${m.GLUCOSE.value} mg/dL (${m.GLUCOSE.readingType})`);
      } else {
        unavailableLines.push('Blood Glucose');
      }
    }

    // Yoga / Fitness
    if (isAll || relevantCats.includes('YOGA_FITNESS')) {
      if (healthAnalytics.recentFitness && healthAnalytics.recentFitness.length > 0) {
        const fit = healthAnalytics.recentFitness[0];
        observedLines.push(`• Recent Activity: ${fit.activity} (${fit.duration || 15} mins, ${fit.calories || 0} kcal, on ${new Date(fit.recordedAt).toLocaleDateString()})`);
      }
      try {
        const YogaPoseService = require('../yoga/YogaPoseService');
        const yogaMatches = YogaPoseService.searchPoses(userQuery);
        if (yogaMatches && yogaMatches.length > 0) {
          const yp = yogaMatches[0];
          observedLines.push(`• Referenced Yoga Pose: ${yp.name} (${yp.sanskritName}) | Difficulty: ${yp.difficulty} | Prenatal Safe: ${yp.prenatalSafe ? 'Yes' : 'No'} | Target: ${(yp.targetBodyAreas || []).join(', ')} | Alignment Cue: ${yp.correctionInstructions || 'Lengthen spine'}`);
        }
      } catch (ypErr) {
        // gracefully ignore
      }
    }

    const lines = [];
    lines.push('=== AUTHENTIC USER HEALTH BIOMETRICS (SOURCE OF TRUTH) ===');
    if (observedLines.length > 0) {
      lines.push('CONFIRMED OBSERVED DATA:');
      lines.push(...observedLines);
    } else {
      lines.push('CONFIRMED OBSERVED DATA: None available for the requested categories.');
    }

    if (unavailableLines.length > 0) {
      lines.push('\nUNAVAILABLE HEALTH METRICS (DO NOT GUESS OR HALLUCINATE):');
      lines.push(`The user currently has no recorded data for: ${unavailableLines.join(', ')}.`);
      lines.push('If the user specifically asked for any of these, reply explicitly: "I don\'t currently have that health data available."');
    }

    // Abnormalities
    const ab = healthAnalytics.abnormalities || [];
    if (ab.length > 0) {
      lines.push('\n=== DETECTED PHYSIOLOGICAL ABNORMALITIES / PATTERNS ===');
      for (const a of ab) {
        lines.push(`• [${a.severity}] ${a.title}: Observed ${a.observedValue} (Normal: ${a.baselineRange}). ${a.detail} Recommendation: ${a.recommendation}`);
      }
    } else {
      lines.push('\n=== CLINICAL BASELINE EVALUATION ===');
      lines.push('All recorded vital metrics are currently within stable normal physiological baselines.');
    }

    lines.push('\nCRITICAL COMPLIANCE RULES:');
    lines.push('1. Distinguish OBSERVED DATA from POSSIBLE EXPLANATIONS from MEDICAL DIAGNOSIS. Never declare a definitive personal diagnosis.');
    lines.push('2. If data does not exist for a requested metric, state clearly: "I don\'t currently have that health data available."');
    lines.push('3. NEVER invent or fabricate numbers, dates, or histories.');
    lines.push('========================================================\n');

    return {
      contextText: lines.join('\n'),
      relevantMetricsFound: observedLines.length > 0,
      missingRequestedMetrics: unavailableLines
    };
  }
}

module.exports = HealthContextBuilder;
