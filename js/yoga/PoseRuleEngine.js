'use strict';

/**
 * PoseRuleEngine & PoseClassifier — Evaluates detected angles against specific pose rules,
 * detects left/right specific biomechanical faults, computes estimated form score breakdown,
 * and handles multi-pose classification.
 */
class PoseRuleEngine {
  /**
   * Evaluate a specific pose given the calculated angles and landmarks.
   * @param {object} pose - Pose definition from YogaPoseLibrary
   * @param {object} angles - Extracted angles from JointAngleCalculator
   * @param {Array} landmarks - Raw 33 MediaPipe landmarks
   * @returns {object} Form evaluation result
   */
  static evaluateForm(pose, angles, landmarks) {
    if (!pose || !angles) {
      return { isCorrect: false, score: 0, breakdown: {}, primaryCorrection: null, faultyJointIdx: null };
    }

    const rules = pose.alignmentRules || [];
    if (rules.length === 0) {
      // Default to pass for purely restorative poses like Savasana
      return {
        isCorrect: true,
        score: 95,
        breakdown: { 'Overall Posture': 95 },
        primaryCorrection: null,
        faultyJointIdx: null
      };
    }

    let allValid = true;
    let primaryCorrection = null;
    let faultyJointIdx = null;
    const breakdown = {};
    let totalScore = 0;

    for (const rule of rules) {
      const res = rule.evaluate(angles, landmarks);
      if (!res.valid) {
        allValid = false;
        if (!primaryCorrection) {
          primaryCorrection = res.message;
          faultyJointIdx = res.jointIdx || null;
        }
        // Calculate deterministic score based on deviation from target angle
        let ruleScore = 65;
        if (typeof res.angle === 'number' && res.target) {
          const match = String(res.target).match(/(\d+)/);
          if (match) {
            const targetCenter = parseInt(match[1], 10);
            const dev = Math.abs(res.angle - targetCenter);
            ruleScore = Math.max(40, Math.min(79, 100 - Math.round(dev * 1.2)));
          }
        }
        breakdown[rule.name] = ruleScore;
      } else {
        let ruleScore = 95;
        if (typeof res.angle === 'number' && res.target) {
          const match = String(res.target).match(/(\d+)/);
          if (match) {
            const targetCenter = parseInt(match[1], 10);
            const dev = Math.abs(res.angle - targetCenter);
            ruleScore = Math.max(88, Math.min(100, 100 - Math.round(dev * 0.5)));
          }
        }
        breakdown[rule.name] = ruleScore;
      }
      totalScore += breakdown[rule.name];
    }

    const avgScore = Math.round(totalScore / rules.length);

    return {
      isCorrect: allValid,
      score: avgScore,
      breakdown,
      primaryCorrection,
      faultyJointIdx
    };
  }

  /**
   * Classify user posture from list of available library poses.
   * Finds the best matching pose based on angle alignment.
   * @param {object} angles
   * @param {Array} landmarks
   * @param {Array} library
   */
  static classifyPose(angles, landmarks, library) {
    if (!angles || !Array.isArray(library)) return null;

    let bestPose = null;
    let bestScore = -1;

    for (const pose of library) {
      if (pose.alignmentRules && pose.alignmentRules.length > 0) {
        const evalResult = this.evaluateForm(pose, angles, landmarks);
        if (evalResult.score > bestScore) {
          bestScore = evalResult.score;
          bestPose = pose;
        }
      }
    }

    return {
      pose: bestPose,
      confidence: bestScore > 75 ? (bestScore / 100).toFixed(2) : '0.60',
      estimatedScore: bestScore
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PoseRuleEngine;
}
if (typeof window !== 'undefined') {
  window.PoseRuleEngine = PoseRuleEngine;
}
