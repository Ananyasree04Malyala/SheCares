'use strict';

/**
 * JointAngleCalculator — Calculates 2D biomechanical angles from normalized MediaPipe landmarks.
 * Works with normalized coordinates [0.0, 1.0].
 * Angle between 3 keypoints A -> B -> C where B is the vertex joint.
 */
class JointAngleCalculator {
  /**
   * Calculate angle in degrees (0–180) formed by 3 keypoints.
   * @param {object} a - Point A {x, y, visibility}
   * @param {object} b - Vertex point B {x, y, visibility}
   * @param {object} c - Point C {x, y, visibility}
   * @returns {number|null} Angle in degrees, or null if keypoints invalid
   */
  static calcAngle(a, b, c) {
    if (!a || !b || !c) return null;
    if (typeof a.x !== 'number' || typeof a.y !== 'number' ||
        typeof b.x !== 'number' || typeof b.y !== 'number' ||
        typeof c.x !== 'number' || typeof c.y !== 'number') return null;

    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return isNaN(angle) ? null : Math.round(angle);
  }

  /**
   * Calculates comprehensive anatomical angles from 33 MediaPipe pose landmarks.
   * MediaPipe landmark indices:
   * 11: left_shoulder, 12: right_shoulder
   * 13: left_elbow,    14: right_elbow
   * 15: left_wrist,    16: right_wrist
   * 23: left_hip,      24: right_hip
   * 25: left_knee,     26: right_knee
   * 27: left_ankle,    28: right_ankle
   * 31: left_foot_idx, 32: right_foot_idx
   */
  static extractAllAngles(lm) {
    if (!Array.isArray(lm) || lm.length < 29) return {};

    const leftKneeAngle = this.calcAngle(lm[23], lm[25], lm[27]);
    const rightKneeAngle = this.calcAngle(lm[24], lm[26], lm[28]);

    const leftElbowAngle = this.calcAngle(lm[11], lm[13], lm[15]);
    const rightElbowAngle = this.calcAngle(lm[12], lm[14], lm[16]);

    const leftHipAngle = this.calcAngle(lm[11], lm[23], lm[25]);
    const rightHipAngle = this.calcAngle(lm[12], lm[24], lm[26]);

    const leftShoulderAngle = this.calcAngle(lm[13], lm[11], lm[23]);
    const rightShoulderAngle = this.calcAngle(lm[14], lm[12], lm[24]);

    const leftAnkleAngle = this.calcAngle(lm[25], lm[27], lm[31]);
    const rightAnkleAngle = this.calcAngle(lm[26], lm[28], lm[32]);

    // Torso / Spine angle relative to vertical axis
    let spineAngle = null;
    if (lm[11] && lm[12] && lm[23] && lm[24]) {
      const midShoulder = { x: (lm[11].x + lm[12].x) / 2, y: (lm[11].y + lm[12].y) / 2 };
      const midHip = { x: (lm[23].x + lm[24].x) / 2, y: (lm[23].y + lm[24].y) / 2 };
      const verticalRef = { x: midHip.x, y: midHip.y - 1.0 };
      spineAngle = this.calcAngle(verticalRef, midHip, midShoulder);
    }

    return {
      leftKnee: leftKneeAngle,
      rightKnee: rightKneeAngle,
      leftElbow: leftElbowAngle,
      rightElbow: rightElbowAngle,
      leftHip: leftHipAngle,
      rightHip: rightHipAngle,
      leftShoulder: leftShoulderAngle,
      rightShoulder: rightShoulderAngle,
      leftShoulderElevation: leftShoulderAngle,
      rightShoulderElevation: rightShoulderAngle,
      leftAnkle: leftAnkleAngle,
      rightAnkle: rightAnkleAngle,
      spine: spineAngle
    };
  }

  /**
   * Check if body landmarks have sufficient visibility confidence.
   * @param {Array} lm
   * @param {number[]} requiredIndices
   * @param {number} minConfidence
   */
  static checkVisibility(lm, requiredIndices = [11, 12, 23, 24, 25, 26], minConfidence = 0.5) {
    if (!Array.isArray(lm) || lm.length < 29) {
      return { ok: false, missing: ['Full Body'], message: 'Please stand back so your full body is visible in the camera frame.' };
    }

    const missing = [];
    const nameMap = {
      11: 'Left Shoulder', 12: 'Right Shoulder',
      13: 'Left Elbow', 14: 'Right Elbow',
      15: 'Left Wrist', 16: 'Right Wrist',
      23: 'Left Hip', 24: 'Right Hip',
      25: 'Left Knee', 26: 'Right Knee',
      27: 'Left Ankle', 28: 'Right Ankle'
    };

    for (const idx of requiredIndices) {
      const pt = lm[idx];
      if (!pt || (typeof pt.visibility === 'number' && pt.visibility < minConfidence)) {
        missing.push(nameMap[idx] || `Joint #${idx}`);
      }
    }

    if (missing.length > 0) {
      return {
        ok: false,
        missing,
        message: `I can't reliably assess your posture because your ${missing.slice(0, 2).join(' & ')} ${missing.length > 1 ? 'are' : 'is'} outside the camera frame or obscured.`
      };
    }

    return { ok: true, missing: [], message: 'Full body keypoints visible' };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JointAngleCalculator;
}
if (typeof window !== 'undefined') {
  window.JointAngleCalculator = JointAngleCalculator;
}
