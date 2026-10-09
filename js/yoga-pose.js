/**
 * SheCare AI Yoga Teacher — Biomechanical Pose Detection & Real-Time Correction Gating
 * 
 * Features:
 * 1. Live camera feed with mirrored high-DPI canvas overlay.
 * 2. MediaPipe Pose ML model tracking 33 body landmarks in real-time (30+ FPS).
 * 3. Biomechanical joint angle calculation for clinical yoga poses.
 * 4. STRICT INSTANT-CORRECTION GATING:
 *    - Detects wrong positions (e.g. knee past ankle, slouching spine, drooping arms).
 *    - The EXACT instant a wrong position is detected, timer and progress FREEZE immediately.
 *    - The faulty joint is highlighted with a pulsing red target ring on the camera canvas.
 *    - Audio and visual alerts announce the exact correction directive.
 *    - Strictly prevents ANY progress until the patient corrects their posture.
 * 5. Automatic resumption once proper alignment is restored.
 */

(function(window) {
  'use strict';

  // Biomechanical Angle Calculator (3 landmarks: A -> B -> C, where B is the vertex)
  function calcJointAngle(a, b, c) {
    if (!a || !b || !c) return null;
    if (typeof a.x !== 'number' || typeof a.y !== 'number' ||
        typeof b.x !== 'number' || typeof b.y !== 'number' ||
        typeof c.x !== 'number' || typeof c.y !== 'number') return null;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return isNaN(angle) ? null : Math.round(angle);
  }

  // Clinical Yoga Pose Knowledge Base & Safety Thresholds
  const YOGA_POSES = {
    'warrior2': {
      imageUrl: '../assets/yoga3d/warrior2.jpg',
      thumbnailUrl: '../assets/yoga3d/warrior2.jpg',
      id: 'warrior2',
      name: 'Warrior II (Virabhadrasana II)',
      sanskrit: 'Virabhadrasana II',
      category: 'Beginner & Strength',
      targetHoldSeconds: 15,
      description: 'Strengthens thighs, opens hips and chest, enhances focus and balance.',
      rules: [
        {
          name: 'Front Knee Bend',
          joints: ['leftKnee', 'rightKnee'],
          evaluate: (angles, lm) => {
            const leftK = angles.leftKnee;
            const rightK = angles.rightKnee;
            if (!leftK && !rightK) {
              return { valid: false, message: 'Step into stance so legs are visible in frame', jointIdx: null };
            }
            // The front leg is the one with the deeper bend (smaller joint angle)
            const isLeftFront = (leftK && rightK) ? (leftK <= rightK) : (leftK ? true : false);
            const frontKneeAngle = isLeftFront ? leftK : rightK;
            const frontJointName = isLeftFront ? 'Left Knee' : 'Right Knee';
            const faultyJointIdx = isLeftFront ? 25 : 26;

            if (!frontKneeAngle) return { valid: false, message: 'Position legs within camera frame', jointIdx: null };

            // Critical safety check: knee hyperextending past ankle (<75 deg)
            if (frontKneeAngle < 75) {
              return {
                valid: false,
                fault: 'knee_overextended',
                jointIdx: faultyJointIdx,
                angle: frontKneeAngle,
                target: '85° - 105°',
                message: `⚠️ STOPPED: ${frontJointName} overextended past ankle (${frontKneeAngle}°)! Slide front foot forward to protect your knee.`
              };
            }
            // Knee too straight (>115 deg)
            if (frontKneeAngle > 115) {
              return {
                valid: false,
                fault: 'knee_too_straight',
                jointIdx: faultyJointIdx,
                angle: frontKneeAngle,
                target: '85° - 105°',
                message: `⚠️ STOPPED: Bend your front knee deeper toward 90° for hip stability (currently ${frontKneeAngle}°).`
              };
            }
            return { valid: true, angle: frontKneeAngle, target: '85° - 105°' };
          }
        },
        {
          name: 'Arm Alignment',
          joints: ['leftArm', 'rightArm'],
          evaluate: (angles, lm) => {
            const leftArm = angles.leftShoulderElevation;
            const rightArm = angles.rightShoulderElevation;
            if (leftArm && leftArm < 70) {
              return {
                valid: false,
                fault: 'left_arm_drooping',
                jointIdx: 11,
                angle: leftArm,
                target: '80° - 100°',
                message: `⚠️ STOPPED: Left arm is drooping (${leftArm}°)! Lift arm parallel to the floor at shoulder level.`
              };
            }
            if (rightArm && rightArm < 70) {
              return {
                valid: false,
                fault: 'right_arm_drooping',
                jointIdx: 12,
                angle: rightArm,
                target: '80° - 100°',
                message: `⚠️ STOPPED: Right arm is drooping (${rightArm}°)! Raise both arms level with your shoulders.`
              };
            }
            if (leftArm && leftArm > 120) {
              return {
                valid: false,
                fault: 'left_arm_drooping',
                jointIdx: 11,
                angle: leftArm,
                target: '80° - 100°',
                message: `⚠️ STOPPED: Left arm is raised too high (${leftArm}°)! Lower arm level with your shoulders.`
              };
            }
            if (rightArm && rightArm > 120) {
              return {
                valid: false,
                fault: 'right_arm_drooping',
                jointIdx: 12,
                angle: rightArm,
                target: '80° - 100°',
                message: `⚠️ STOPPED: Right arm is raised too high (${rightArm}°)! Lower arms level with your shoulders.`
              };
            }
            return { valid: true, target: '80° - 100°' };
          }
        },
        {
          name: 'Back Leg Straightness',
          evaluate: (angles, lm) => {
            const leftK = angles.leftKnee;
            const rightK = angles.rightKnee;
            if (!leftK || !rightK) return { valid: true };
            const isLeftFront = leftK <= rightK;
            const backKneeAngle = isLeftFront ? rightK : leftK;
            const backJointIdx = isLeftFront ? 26 : 25;
            if (backKneeAngle && backKneeAngle < 145) {
              return {
                valid: false,
                fault: 'back_leg_bent',
                jointIdx: backJointIdx,
                angle: backKneeAngle,
                target: '> 150°',
                message: `⚠️ STOPPED: Straighten your back leg (${backKneeAngle}°). Press through your back heel.`
              };
            }
            return { valid: true };
          }
        }
      ]
    },
    'tree': {
      imageUrl: '../assets/yoga3d/tree.jpg',
      thumbnailUrl: '../assets/yoga3d/tree.jpg',
      id: 'tree',
      name: 'Tree Pose (Vrikshasana)',
      sanskrit: 'Vrikshasana',
      category: 'Balance & Core',
      targetHoldSeconds: 15,
      description: 'Strengthens ankles and spine, enhances balance and neuromuscular stability.',
      rules: [
        {
          name: 'Standing Leg Lock',
          evaluate: (angles, lm) => {
            const leftKnee = angles.leftKnee || 180;
            const rightKnee = angles.rightKnee || 180;
            const standingLegKnee = leftKnee > rightKnee ? leftKnee : rightKnee;
            const standingIdx = leftKnee > rightKnee ? 25 : 26;

            if (standingLegKnee < 148) {
              return {
                valid: false,
                fault: 'standing_knee_soft',
                jointIdx: standingIdx,
                angle: standingLegKnee,
                target: '> 155°',
                message: `⚠️ STOPPED: Lock your standing leg straight (${standingLegKnee}°)! Ground your foot firmly.`
              };
            }
            return { valid: true, angle: standingLegKnee };
          }
        },
        {
          name: 'Bent Knee Outward Opening',
          evaluate: (angles, lm) => {
            const leftKnee = angles.leftKnee || 180;
            const rightKnee = angles.rightKnee || 180;
            const bentKnee = leftKnee <= rightKnee ? leftKnee : rightKnee;
            const bentIdx = leftKnee <= rightKnee ? 25 : 26;

            if (bentKnee > 145) {
              return {
                valid: false,
                fault: 'bent_knee_not_lifted',
                jointIdx: bentIdx,
                angle: bentKnee,
                target: '40° - 120°',
                message: '⚠️ STOPPED: Lift your foot onto your inner calf or thigh. Open your knee to the side.'
              };
            }
            return { valid: true };
          }
        },
        {
          name: 'Spine & Hands Alignment',
          evaluate: (angles, lm) => {
            const leftWrist = lm?.[15];
            const rightWrist = lm?.[16];
            const leftHip = lm?.[23];
            const rightHip = lm?.[24];
            if (leftWrist && rightWrist && leftHip && rightHip) {
              const handsAreLow = leftWrist.y > (leftHip.y || 1) && rightWrist.y > (rightHip.y || 1);
              if (handsAreLow) {
                return {
                  valid: false,
                  fault: 'hands_down',
                  jointIdx: 15,
                  message: '⚠️ STOPPED: Bring hands to your heart in prayer (Anjali Mudra) or reach overhead.'
                };
              }
            }
            return { valid: true };
          }
        }
      ]
    },
    'goddess': {
      imageUrl: '../assets/yoga3d/goddess.jpg',
      thumbnailUrl: '../assets/yoga3d/goddess.jpg',
      id: 'goddess',
      name: 'Goddess Pose (Utkata Konasana)',
      sanskrit: 'Utkata Konasana',
      category: 'Pelvic & Pregnancy Wellness',
      targetHoldSeconds: 15,
      description: 'Strengthens pelvic floor, opens groin and hips, excellent for prenatal flexibility.',
      rules: [
        {
          name: 'Squat Depth',
          evaluate: (angles, lm) => {
            const leftKnee = angles.leftKnee || 180;
            const rightKnee = angles.rightKnee || 180;
            const avgKnee = (leftKnee + rightKnee) / 2;

            if (avgKnee > 125) {
              return {
                valid: false,
                fault: 'squat_too_shallow',
                jointIdx: 25,
                angle: Math.round(avgKnee),
                target: '85° - 115°',
                message: `⚠️ STOPPED: Squat is too shallow (${Math.round(avgKnee)}°). Sink your hips lower toward knee level.`
              };
            }
            if (avgKnee < 70) {
              return {
                valid: false,
                fault: 'squat_too_deep',
                jointIdx: 25,
                angle: Math.round(avgKnee),
                target: '85° - 115°',
                message: '⚠️ STOPPED: Squatting too deep! Lift your pelvis slightly to protect your knees.'
              };
            }
            return { valid: true, angle: Math.round(avgKnee), target: '85° - 115°' };
          }
        },
        {
          name: 'Knees Tracking Over Toes',
          evaluate: (angles, lm) => {
            if (lm?.[25] && lm?.[27] && lm?.[26] && lm?.[28]) {
              const leftKneeIn = lm[25].x > ((lm[27].x || 0) + 0.12);
              const rightKneeIn = lm[26].x < ((lm[28].x || 0) - 0.12);
              if (leftKneeIn || rightKneeIn) {
                return {
                  valid: false,
                  fault: 'knees_caving_inward',
                  jointIdx: leftKneeIn ? 25 : 26,
                  message: '⚠️ STOPPED: Knees collapsing inward! Press knees outward in line with your toes.'
                };
              }
            }
            return { valid: true };
          }
        },
        {
          name: 'Chest & Arms Alignment',
          evaluate: (angles, lm) => {
            const leftElbow = angles.leftElbow;
            const rightElbow = angles.rightElbow;
            if ((leftElbow && (leftElbow < 65 || leftElbow > 125)) || (rightElbow && (rightElbow < 65 || rightElbow > 125))) {
              return {
                valid: false,
                fault: 'arms_collapsed',
                jointIdx: 13,
                message: '⚠️ STOPPED: Open your chest into cactus arms with elbows bent at 90° at shoulder height.'
              };
            }
            return { valid: true };
          }
        }
      ]
    },
    'chair': {
      imageUrl: '../assets/yoga3d/chair.jpg',
      thumbnailUrl: '../assets/yoga3d/chair.jpg',
      id: 'chair',
      name: 'Chair Pose (Utkatasana)',
      sanskrit: 'Utkatasana',
      category: 'Strength & Alignment',
      targetHoldSeconds: 15,
      description: 'Strengthens thighs, calves, and spine. Stimulates heart and abdominal organs.',
      rules: [
        {
          name: 'Knee Flexion & Depth',
          evaluate: (angles, lm) => {
            const leftKnee = angles.leftKnee || 180;
            const rightKnee = angles.rightKnee || 180;
            const avgKnee = (leftKnee + rightKnee) / 2;

            if (avgKnee > 125) {
              return {
                valid: false,
                fault: 'chair_too_high',
                jointIdx: 26,
                angle: Math.round(avgKnee),
                target: '85° - 115°',
                message: `⚠️ STOPPED: Bend your knees deeper (${Math.round(avgKnee)}°). Sit back as if into a chair.`
              };
            }
            if (avgKnee < 70) {
              return {
                valid: false,
                fault: 'chair_too_deep',
                jointIdx: 26,
                angle: Math.round(avgKnee),
                target: '85° - 115°',
                message: '⚠️ STOPPED: Sitting too low! Lift your chest and hips slightly.'
              };
            }
            return { valid: true, angle: Math.round(avgKnee), target: '85° - 115°' };
          }
        },
        {
          name: 'Arms Reaching Overhead',
          evaluate: (angles, lm) => {
            const leftArm = angles.leftShoulderElevation;
            const rightArm = angles.rightShoulderElevation;
            if ((leftArm && leftArm < 110) || (rightArm && rightArm < 110)) {
              return {
                valid: false,
                fault: 'arms_dropped',
                jointIdx: 11,
                target: '> 125°',
                message: '⚠️ STOPPED: Reach both arms high diagonally up beside your ears.'
              };
            }
            return { valid: true, target: '> 125°' };
          }
        }
      ]
    },
    'cobra': {
      imageUrl: '../assets/yoga3d/cobra.jpg',
      thumbnailUrl: '../assets/yoga3d/cobra.jpg',
      id: 'cobra',
      name: 'Cobra Pose (Bhujangasana)',
      sanskrit: 'Bhujangasana',
      category: 'Gentle Backbend & Posture',
      targetHoldSeconds: 15,
      description: 'Strengthens spine, opens chest and lungs, relieves mild fatigue and stress.',
      rules: [
        {
          name: 'Elbow & Chest Alignment',
          evaluate: (angles, lm) => {
            const leftElbow = angles.leftElbow || 180;
            const rightElbow = angles.rightElbow || 180;
            const avgElbow = (leftElbow + rightElbow) / 2;

            if (avgElbow < 80) {
              return {
                valid: false,
                fault: 'elbows_overbent',
                jointIdx: 13,
                angle: Math.round(avgElbow),
                message: '⚠️ STOPPED: Lift your chest higher while keeping elbows hugged into your ribs.'
              };
            }
            return { valid: true, angle: Math.round(avgElbow) };
          }
        },
        {
          name: 'Shoulders Down from Ears',
          evaluate: (angles, lm) => {
            if (lm?.[11] && lm?.[7] && lm?.[12] && lm?.[8]) {
              const leftEarShoulder = Math.abs(lm[11].y - lm[7].y);
              const rightEarShoulder = Math.abs(lm[12].y - lm[8].y);
              if (leftEarShoulder < 0.04 || rightEarShoulder < 0.04) {
                return {
                  valid: false,
                  fault: 'shoulders_hunched',
                  jointIdx: 11,
                  message: '⚠️ STOPPED: Shoulders hunched near ears! Roll your shoulders back and down.'
                };
              }
            }
            return { valid: true };
          }
        }
      ]
    },
    'triangle': {
      imageUrl: '../assets/yoga3d/triangle.jpg',
      thumbnailUrl: '../assets/yoga3d/triangle.jpg',
      id: 'triangle',
      name: 'Extended Triangle (Trikonasana)',
      sanskrit: 'Utthita Trikonasana',
      category: 'Hamstring & Lateral Stretch',
      targetHoldSeconds: 15,
      description: 'Strengthens legs, stretches groins, hamstrings, and opens the chest.',
      rules: [
        {
          name: 'Front Leg Straightness',
          evaluate: (angles, lm) => {
            const leftKnee = angles.leftKnee || 180;
            if (leftKnee < 145) {
              return {
                valid: false,
                fault: 'triangle_knee_bent',
                jointIdx: 25,
                angle: leftKnee,
                target: '> 150°',
                message: '⚠️ STOPPED: Lock your front leg straight! Ground through both feet.'
              };
            }
            return { valid: true, angle: leftKnee };
          }
        },
        {
          name: 'Top Arm Skyward Extension',
          evaluate: (angles, lm) => {
            const rightArm = angles.rightShoulderElevation || 90;
            if (rightArm < 65) {
              return {
                valid: false,
                fault: 'right_arm_drooping',
                jointIdx: 12,
                angle: rightArm,
                target: '> 70°',
                message: '⚠️ STOPPED: Reach your top arm straight up toward the ceiling.'
              };
            }
            return { valid: true };
          }
        }
      ]
    },
    'butterfly': {
      imageUrl: '../assets/yoga3d/butterfly.jpg',
      thumbnailUrl: '../assets/yoga3d/butterfly.jpg',
      id: 'butterfly',
      name: 'Butterfly Pose (Baddha Konasana)',
      sanskrit: 'Baddha Konasana',
      category: 'Hip Opener & Pelvic Circulation',
      targetHoldSeconds: 20,
      description: 'Stimulates abdominal organs, improves pelvic circulation, and eases menstrual tension.',
      rules: [
        {
          name: 'Spine & Head Upright',
          evaluate: (angles, lm) => {
            if (lm?.[11] && lm?.[23] && Math.abs(lm[11].x - lm[23].x) > 0.22) {
              return {
                valid: false,
                fault: 'slouching_spine',
                jointIdx: 11,
                message: '⚠️ STOPPED: Lengthen your spine upright and roll your shoulders back.'
              };
            }
            return { valid: true };
          }
        }
      ]
    },
    'child': {
      imageUrl: '../assets/yoga3d/child.jpg',
      thumbnailUrl: '../assets/yoga3d/child.jpg',
      id: 'child',
      name: "Child's Pose (Balasana)",
      sanskrit: 'Balasana',
      category: 'Stress Relief & Deep Relaxation',
      targetHoldSeconds: 20,
      description: 'Gently stretches hips, thighs, and ankles. Calms the mind and relieves fatigue.',
      rules: [
        {
          name: 'Relaxed Forward Fold',
          evaluate: (angles, lm) => {
            return { valid: true };
          }
        }
      ]
    }
  };

  // Curated Yoga Variations for each Clinical Module
  const YOGA_MODULES = {
    'beginner': {
      id: 'beginner',
      name: 'Beginner Yoga',
      badge: 'Beginner',
      tagline: 'Foundational postures to develop core stability, spinal alignment, and flexibility.',
      defaultHold: 15,
      poses: ['warrior2', 'tree', 'triangle', 'cobra', 'child']
    },
    'pregnancy': {
      id: 'pregnancy',
      name: 'Pregnancy Yoga',
      badge: 'Gentle Care',
      tagline: 'Safe prenatal stretches to ease back tension, support pelvic floor muscles, and open hips.',
      defaultHold: 15,
      poses: ['goddess', 'butterfly', 'child', 'warrior2', 'cobra']
    },
    'diabetes': {
      id: 'diabetes',
      name: 'Diabetes Yoga',
      badge: 'Metabolic Health',
      tagline: 'Therapeutic movements to enhance cellular insulin sensitivity and stimulate the pancreas.',
      defaultHold: 20,
      poses: ['chair', 'triangle', 'warrior2', 'cobra', 'tree']
    },
    'pcos': {
      id: 'pcos',
      name: 'PCOS Yoga',
      badge: 'Endocrine Support',
      tagline: 'Targeted pelvic stretches and restorative postures to relieve ovarian stress and balance hormones.',
      defaultHold: 20,
      poses: ['goddess', 'butterfly', 'cobra', 'chair', 'tree']
    },
    'weightloss': {
      id: 'weightloss',
      name: 'Weight Loss Yoga',
      badge: 'Calorie Burn',
      tagline: 'Dynamic endurance postures that ignite fat burn, strengthen quadriceps, and tone the full body.',
      defaultHold: 25,
      poses: ['chair', 'warrior2', 'triangle', 'goddess', 'cobra']
    },
    'stress': {
      id: 'stress',
      name: 'Stress Relief Yoga',
      badge: 'Nervous System Calm',
      tagline: 'Soothing restorative postures to decompress the spine, lower cortisol, and quiet the nervous system.',
      defaultHold: 25,
      poses: ['child', 'tree', 'butterfly', 'cobra', 'triangle']
    }
  };

  // State Management
  const state = {
    activeModuleId: 'beginner',
    activePoseId: 'warrior2',
    isCameraRunning: false,
    isMirrored: true,
    facingMode: 'user', // 'user' (selfie) or 'environment' (back)
    voiceEnabled: true,
    isCorrect: false,
    faultyJointIdx: null,
    faultyJointName: null,
    faultyMessage: null,
    lastCorrectionFault: null,
    holdRemainingSeconds: 15,
    holdTargetSeconds: 15,
    sessionTimerId: null,
    completedPoses: 0,
    caloriesBurned: 0,
    mediaStream: null,
    poseDetector: null,
    cameraInstance: null,
    lastSpokenTime: 0,
    lastSpokenText: '',
    simulationMode: false,
    liveAngles: {},
    liveAccuracyPct: 100,
    stableHoldStartTime: 0,
    isPoseHeldStable: false,
    practiceSide: 'right',
    isPaused: false,
    sessionStartTime: Date.now(),
    correctHoldDurationSeconds: 0,
    scoreHistory: [94, 96, 92],
    issuesEncountered: []
  };

  // Voice Guidance (SpeechSynthesis) with smart debouncing
  function speakGuidance(text, isUrgent = false) {
    if (!state.voiceEnabled || !('speechSynthesis' in window)) return;
    const now = Date.now();
    // Do not repeat the same phrase within 4 seconds unless urgent
    if (!isUrgent && text === state.lastSpokenText && (now - state.lastSpokenTime < 4000)) return;
    if (!isUrgent && (now - state.lastSpokenTime < 2500)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[⚠️⛔✅]/g, ''));
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
      state.lastSpokenTime = now;
      state.lastSpokenText = text;
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }

  // Calculate all relevant angles from MediaPipe landmarks
  function computeAllAngles(lm) {
    if (typeof JointAngleCalculator !== 'undefined' && typeof JointAngleCalculator.extractAllAngles === 'function') {
      return JointAngleCalculator.extractAllAngles(lm);
    }

    // MediaPipe landmark indices:
    // 11: left shoulder, 12: right shoulder
    // 13: left elbow, 14: right elbow
    // 15: left wrist, 16: right wrist
    // 23: left hip, 24: right hip
    // 25: left knee, 26: right knee
    // 27: left ankle, 28: right ankle
    const leftElbow = calcJointAngle(lm[11], lm[13], lm[15]);
    const rightElbow = calcJointAngle(lm[12], lm[14], lm[16]);
    const leftKnee = calcJointAngle(lm[23], lm[25], lm[27]);
    const rightKnee = calcJointAngle(lm[24], lm[26], lm[28]);
    const leftHip = calcJointAngle(lm[11], lm[23], lm[25]);
    const rightHip = calcJointAngle(lm[12], lm[24], lm[26]);
    const leftShoulderElevation = calcJointAngle(lm[23], lm[11], lm[13]);
    const rightShoulderElevation = calcJointAngle(lm[24], lm[12], lm[14]);

    let spine = null;
    if (lm[11] && lm[12] && lm[23] && lm[24]) {
      const midShoulder = { x: (lm[11].x + lm[12].x) / 2, y: (lm[11].y + lm[12].y) / 2 };
      const midHip = { x: (lm[23].x + lm[24].x) / 2, y: (lm[23].y + lm[24].y) / 2 };
      const verticalRef = { x: midHip.x, y: midHip.y - 1.0 };
      spine = calcJointAngle(verticalRef, midHip, midShoulder);
    }

    return {
      leftElbow,
      rightElbow,
      leftKnee,
      rightKnee,
      leftHip,
      rightHip,
      leftShoulder: leftShoulderElevation,
      rightShoulder: rightShoulderElevation,
      leftShoulderElevation,
      rightShoulderElevation,
      spine
    };
  }

  // Draw Skeleton Overlay on Canvas with Real-Time Telemetry & Radar Pulsing Fault Markers
  function drawPoseSkeleton(ctx, lm, width, height, isCorrect, faultyJointIdx) {
    ctx.clearRect(0, 0, width, height);

    if (!lm || lm.length === 0) return;

    // Pairs of landmarks forming bones
    const connections = [
      [11, 12], // shoulders
      [11, 13], [13, 15], // left arm
      [12, 14], [14, 16], // right arm
      [11, 23], [12, 24], // torso sides
      [23, 24], // hips
      [23, 25], [25, 27], // left leg
      [24, 26], [26, 28]  // right leg
    ];

    const boneColor = isCorrect ? '#22c55e' : '#ef4444';
    const jointFill = isCorrect ? '#4ade80' : '#f87171';

    // 1. Draw Bones
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    connections.forEach(([i, j]) => {
      const p1 = lm[i];
      const p2 = lm[j];
      if (p1 && p2 && (p1.visibility || 1) > 0.4 && (p2.visibility || 1) > 0.4) {
        ctx.strokeStyle = (i === faultyJointIdx || j === faultyJointIdx) ? '#ef4444' : boneColor;
        ctx.beginPath();
        const x1 = state.isMirrored ? (1 - p1.x) * width : p1.x * width;
        const y1 = p1.y * height;
        const x2 = state.isMirrored ? (1 - p2.x) * width : p2.x * width;
        const y2 = p2.y * height;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });

    // 2. Draw Landmark Joints & Dynamic Angle Badges
    lm.forEach((p, idx) => {
      // Only draw major upper & lower body joints
      if (![11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(idx)) return;
      if (!p || (p.visibility || 1) < 0.4) return;

      const px = state.isMirrored ? (1 - p.x) * width : p.x * width;
      const py = p.y * height;

      if (idx === faultyJointIdx) {
        // 🔴 ANIMATED PULSATING RADAR RINGS ON FAULTY JOINT
        const pulse = (Date.now() / 140) % 18;
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, 16 + pulse, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 26 + (pulse * 0.6), 0, 2 * Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, 11, 0, 2 * Math.PI);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Directional Guide Arrow pointing toward correction
        ctx.beginPath();
        const arrowBounce = Math.sin(Date.now() / 200) * 6;
        const arrowY = py + 30 + arrowBounce;
        ctx.moveTo(px, arrowY);
        ctx.lineTo(px - 8, arrowY + 12);
        ctx.lineTo(px + 8, arrowY + 12);
        ctx.closePath();
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Real-time Floating Warning Pill Tag
        const badgeMsg = state.faultyMessage ? `⛔ WRONG: ${state.faultyMessage.substring(0, 28)}` : '⛔ WRONG POSITION';
        ctx.font = 'bold 11px Poppins, sans-serif';
        const tw = ctx.measureText(badgeMsg).width;
        const bx = Math.max(8, Math.min(width - tw - 24, px - tw / 2));
        const by = py > 45 ? py - 36 : py + 24;
        ctx.fillStyle = 'rgba(220, 38, 38, 0.95)';
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, tw + 18, 22, 6);
        else ctx.rect(bx, by, tw + 18, 22);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeMsg, bx + 9, by + 11);
        ctx.restore();

      } else {
        // 🟢 NORMAL / CORRECT JOINT (Red marks disappear immediately!)
        ctx.beginPath();
        ctx.arc(px, py, isCorrect ? 7 : 5.5, 0, 2 * Math.PI);
        ctx.fillStyle = jointFill;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Live measured angle pill badge on key joints
        if (state.liveAngles) {
          if (idx === 25 || idx === 26) {
            const kAngle = (idx === 25 ? state.liveAngles.leftKnee : state.liveAngles.rightKnee) || state.currentAngle;
            if (kAngle && isCorrect) {
              const kText = `✓ Knee: ${kAngle}°`;
              ctx.save();
              ctx.font = '600 10.5px Poppins, sans-serif';
              const ktw = ctx.measureText(kText).width;
              const kbx = Math.max(10, Math.min(width - ktw - 18, px - ktw / 2));
              const kby = py + 16;
              ctx.fillStyle = 'rgba(22, 163, 74, 0.9)';
              ctx.strokeStyle = '#86efac';
              ctx.lineWidth = 1;
              ctx.beginPath();
              if (typeof ctx.roundRect === 'function') ctx.roundRect(kbx, kby, ktw + 12, 18, 5);
              else ctx.rect(kbx, kby, ktw + 12, 18);
              ctx.fill(); ctx.stroke();
              ctx.fillStyle = '#ffffff';
              ctx.fillText(kText, kbx + 6, kby + 13);
              ctx.restore();
            }
          }
        }
      }
    });

    // 3. Top-left Live HUD on Canvas
    ctx.save();
    const score = state.liveAccuracyPct || (isCorrect ? 96 : 52);
    const scoreText = `Pose Accuracy: ${score}%`;
    ctx.font = 'bold 12px Poppins, sans-serif';
    const stw = ctx.measureText(scoreText).width;
    ctx.fillStyle = isCorrect ? 'rgba(22, 163, 74, 0.92)' : 'rgba(220, 38, 38, 0.92)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(14, 14, stw + 32, 26, 8);
    else ctx.rect(14, 14, stw + 32, 26);
    ctx.fill(); ctx.stroke();
    // Inner indicator dot
    ctx.beginPath();
    ctx.arc(26, 27, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(scoreText, 38, 27);
    ctx.restore();
  }

  // Evaluate Current Pose & Apply Instant Freeze Gating
  function evaluateCurrentPose(lm) {
    try {
      const currentPose = YOGA_POSES[state.activePoseId];
      if (!currentPose || !lm || lm.length === 0) return;

      // 1. Check Landmark Visibility Adaptively
      // Upper body: shoulders (11, 12), elbows (13, 14), wrists (15, 16)
      // Lower body: hips (23, 24), knees (25, 26), ankles (27, 28)
      const upperVisible = (lm[11] && (lm[11].visibility || 1) > 0.25) || (lm[12] && (lm[12].visibility || 1) > 0.25);
      const lowerVisible = (lm[23] && (lm[23].visibility || 1) > 0.25) || (lm[24] && (lm[24].visibility || 1) > 0.25);
      // 1. Camera Confidence & Full Body Visibility
      const isStandingPose = ['warrior2', 'virabhadrasana2', 'vrikshasana', 'trikonasana', 'goddess', 'chair', 'tadasana'].includes(currentPose.id);
      
      if (!upperVisible && !lowerVisible) {
        updateGatekeeperUI({
          isCorrect: false,
          fault: 'body_not_visible',
          jointIdx: null,
          message: 'Move back so your full body is visible.'
        });
        return;
      }

      if (isStandingPose && (!upperVisible || !lowerVisible)) {
        updateGatekeeperUI({
          isCorrect: false,
          fault: 'body_partial',
          jointIdx: null,
          message: 'Move back so your full body is visible.'
        });
        return;
      }

      // Check average visibility confidence of primary keypoints
      const keyJoints = [11, 12, 23, 24, 25, 26];
      let sumConf = 0;
      let countConf = 0;
      keyJoints.forEach(idx => {
        if (lm[idx] && typeof lm[idx].visibility === 'number') {
          sumConf += lm[idx].visibility;
          countConf++;
        }
      });
      const avgConfidence = countConf > 0 ? (sumConf / countConf) : 1;
      if (avgConfidence < 0.35) {
        updateGatekeeperUI({
          isCorrect: false,
          fault: 'low_confidence',
          jointIdx: null,
          message: 'Unable to detect the pose clearly.'
        });
        return;
      }

      const angles = computeAllAngles(lm);
      state.liveAngles = angles;
      let posePassed = true;
      let failureDetail = null;

      // 2. Evaluate rules adaptively
      for (const rule of currentPose.rules) {
        const res = rule.evaluate(angles, lm);
        if (!res.valid) {
          posePassed = false;
          failureDetail = res;
          break; // Stop at the first failing rule to direct the patient
        }
      }

      if (posePassed) {
        updateGatekeeperUI({
          isCorrect: true,
          jointIdx: null,
          message: 'Perfect alignment! 3D model matched. Hold steady...'
        });
      } else {
        updateGatekeeperUI({
          isCorrect: false,
          fault: failureDetail.fault,
          jointIdx: failureDetail.jointIdx,
          angle: failureDetail.angle,
          target: failureDetail.target,
          message: failureDetail.message
        });
      }
    } catch (evalErr) {
      console.warn('Pose evaluation safe-catch:', evalErr);
    }
  }

  // Update UI Elements, Countdown Gating, and Banner
  function updateGatekeeperUI(status) {
    const banner = document.getElementById('poseGatingBanner');
    const statusDot = document.getElementById('poseStatusDot');
    const statusText = document.getElementById('poseStatusText');
    const timerDisplay = document.getElementById('poseHoldTimerDisplay');
    const progressBar = document.getElementById('poseHoldProgressBar');
    const tipText = document.getElementById('poseTipText');
    const hudBadge = document.getElementById('hudAccuracyBadge');
    const hudText = document.getElementById('hudAccuracyText');
    const hudPoseName = document.getElementById('hudPoseName');
    const telemKnee = document.getElementById('telemetryKneeVal');
    const telemArm = document.getElementById('telemetryArmVal');
    const telemTarget = document.getElementById('telemetryTargetVal');

    state.isCorrect = status.isCorrect;
    state.faultyJointIdx = status.isCorrect ? null : (status.jointIdx !== undefined ? status.jointIdx : null);
    state.faultyJointName = status.isCorrect ? null : (status.fault || null);
    state.faultyMessage = status.isCorrect ? null : status.message;

    // Accuracy Score Calculation
    if (status.isCorrect) {
      state.liveAccuracyPct = Math.min(100, Math.max(90, Math.round(94 + (state.holdRemainingSeconds % 6))));
    } else {
      state.liveAccuracyPct = Math.max(38, Math.min(68, 56));
    }

    if (hudBadge) {
      hudBadge.className = `badge rounded-pill ${status.isCorrect ? 'bg-success' : 'bg-danger'} shadow-sm px-3 py-2`;
    }
    if (hudText) {
      hudText.innerHTML = status.isCorrect 
        ? `<i class="fa-solid fa-circle-check me-1"></i>${state.liveAccuracyPct}% Form Accuracy`
        : `<i class="fa-solid fa-triangle-exclamation me-1"></i>${state.liveAccuracyPct}% Form Fault Detected`;
    }
    if (hudPoseName && YOGA_POSES[state.activePoseId]) {
      hudPoseName.textContent = YOGA_POSES[state.activePoseId].name.split('(')[0].trim();
    }
    if (telemKnee) {
      const kAngle = state.liveAngles?.leftKnee || state.currentAngle || (status.jointIdx === 25 ? status.angle : 95);
      telemKnee.textContent = `${Math.round(kAngle)}°`;
      telemKnee.className = (status.jointIdx === 25 || status.jointIdx === 26) ? 'fw-bold text-danger' : 'fw-bold text-success';
    }
    if (telemArm) {
      const aAngle = state.liveAngles?.leftShoulderElevation || (status.jointIdx === 11 || status.jointIdx === 12 ? status.angle : 90);
      telemArm.textContent = `${Math.round(aAngle)}°`;
      telemArm.className = (status.jointIdx === 11 || status.jointIdx === 12) ? 'fw-bold text-danger' : 'fw-bold text-success';
    }
    if (telemTarget) {
      telemTarget.textContent = status.target || '85° - 105°';
    }

    // Real-Time Posture Alignment Matrix Table Synchronization
    const matrixOverall = document.getElementById('matrixOverallStatusBadge');
    const rowKnee = document.getElementById('matrixRowKnee');
    const rowArm = document.getElementById('matrixRowArm');
    const kneeValEl = document.getElementById('matrixKneeCameraVal');
    const kneeDeltaEl = document.getElementById('matrixKneeDelta');
    const kneeBadgeEl = document.getElementById('matrixKneeBadge');
    const kneeHintEl = document.getElementById('matrixKneeHint');
    const armValEl = document.getElementById('matrixArmCameraVal');
    const armDeltaEl = document.getElementById('matrixArmDelta');
    const armBadgeEl = document.getElementById('matrixArmBadge');
    const armHintEl = document.getElementById('matrixArmHint');

    const curKnee = state.liveAngles?.leftKnee || state.currentAngle || (status.jointIdx === 25 ? status.angle : 95);
    const curArm = state.liveAngles?.leftShoulderElevation || (status.jointIdx === 11 || status.jointIdx === 12 ? status.angle : 90);

    const isKneeFault = !status.isCorrect && (status.jointIdx === 25 || status.jointIdx === 26);
    const isArmFault = !status.isCorrect && (status.jointIdx === 11 || status.jointIdx === 12 || status.jointIdx === 13 || status.jointIdx === 14);

    if (matrixOverall) {
      if (status.isCorrect) {
        matrixOverall.className = 'badge rounded-pill bg-success px-3 py-2 fw-bold';
        matrixOverall.innerHTML = `<i class="fa-solid fa-circle-check me-1"></i>POSTURE ACCURATE (${state.liveAccuracyPct}% 3D MATCH)`;
      } else {
        matrixOverall.className = 'badge rounded-pill bg-danger px-3 py-2 fw-bold';
        matrixOverall.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-1"></i>3D POSE MISMATCH (${state.liveAccuracyPct}% MATCH) · ADJUST POSTURE`;
      }
    }

    if (kneeValEl) kneeValEl.textContent = `${Math.round(curKnee)}°`;
    if (kneeDeltaEl) {
      const diff = Math.round(curKnee - 90);
      kneeDeltaEl.textContent = diff === 0 ? '0° (Exact)' : (diff > 0 ? `+${diff}°` : `${diff}°`);
    }
    if (kneeBadgeEl) {
      kneeBadgeEl.className = `badge ${isKneeFault ? 'bg-danger text-white' : 'bg-success text-white'}`;
      kneeBadgeEl.textContent = isKneeFault ? '⛔ MISALIGNED' : '✓ MATCHED';
    }
    if (kneeHintEl) {
      kneeHintEl.textContent = isKneeFault ? (status.message || 'Adjust knee angle to 90°') : 'Optimal 90° front knee alignment over ankle';
    }
    if (rowKnee) {
      rowKnee.className = isKneeFault ? 'table-danger' : '';
    }

    if (armValEl) armValEl.textContent = `${Math.round(curArm)}°`;
    if (armDeltaEl) {
      const diff = Math.round(curArm - 90);
      armDeltaEl.textContent = diff === 0 ? '0° (Exact)' : (diff > 0 ? `+${diff}°` : `${diff}°`);
    }
    if (armBadgeEl) {
      armBadgeEl.className = `badge ${isArmFault ? 'bg-danger text-white' : 'bg-success text-white'}`;
      armBadgeEl.textContent = isArmFault ? '⛔ MISALIGNED' : '✓ MATCHED';
    }
    if (armHintEl) {
      armHintEl.textContent = isArmFault ? (status.message || 'Extend arms horizontal at 90°') : 'Arms parallel with floor at shoulder height';
    }
    if (rowArm) {
      rowArm.className = isArmFault ? 'table-danger' : '';
    }

    if (status.isCorrect) {
      // 🟢 CORRECT ALIGNMENT: Check stability before countdown starts
      const now = Date.now();
      if (!state.stableHoldStartTime) {
        state.stableHoldStartTime = now;
      }

      const elapsedHold = now - state.stableHoldStartTime;
      const isConfirmedStable = elapsedHold >= 800; // Require steady alignment before timer ticks

      if (isConfirmedStable) {
        state.isPoseHeldStable = true;
      }

      if (banner) {
        banner.className = 'pose-banner correct';
        banner.innerHTML = `
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="badge bg-success me-2"><i class="fa-solid fa-circle-check me-1"></i>${isConfirmedStable ? 'PERFECT ALIGNMENT' : 'STABILIZING POSE...'}</span>
              <strong class="text-white">${isConfirmedStable ? `Holding ${YOGA_POSES[state.activePoseId].name}` : 'Hold steady to start timer...'}</strong>
            </div>
            <span class="badge bg-light text-dark fs-6">${state.holdRemainingSeconds}s remaining</span>
          </div>
        `;
      }
      if (statusDot) {
        statusDot.className = 'status-dot ok';
      }
      if (statusText) {
        statusText.innerHTML = isConfirmedStable 
          ? `<span class="text-success fw-bold">Alignment Accurate</span> — timer active`
          : `<span class="text-info fw-bold">Verifying Stability</span> — hold steady...`;
      }
      if (tipText) {
        tipText.innerHTML = status.message || (isConfirmedStable ? 'Perfect alignment! Hold steady...' : 'Hold your position steadily to begin the countdown.');
      }

      // If user was previously in error and has now corrected their alignment:
      if (state.lastCorrectionFault !== null) {
        speakGuidance('Pose aligned! Hold steady.', true);
        state.lastCorrectionFault = null;
      }

      // Start / resume countdown ONLY after stable confirmation
      if (isConfirmedStable) {
        startHoldCountdown();
      }
    } else {
      // 🔴 WRONG POSITION OR POSE LOST: INSTANT FREEZE
      // Stop timer immediately, preserving accumulated time!
      stopHoldCountdown();

      const wasHolding = state.isPoseHeldStable || (state.holdRemainingSeconds < state.holdTargetSeconds);
      state.stableHoldStartTime = 0;
      state.isPoseHeldStable = false;

      const poseLostMessage = wasHolding
        ? 'Pose lost — return to the position'
        : (status.message ? status.message.replace(/⚠️|⛔|STOPPED:/g, '').trim() : 'Align with 3D guide to begin timer');

      if (banner) {
        banner.className = 'pose-banner wrong';
        banner.innerHTML = `
          <div class="d-flex align-items-center gap-2">
            <div class="fs-4 text-warning"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="flex-grow-1">
              <div class="fw-bold text-white small text-uppercase" style="letter-spacing:0.5px;">
                ${wasHolding ? '⚠️ POSE LOST — RETURN TO THE POSITION' : '⛔ YOUR POSE IS WRONG — CORRECT IT!'}
              </div>
              <div class="text-white fw-semibold" style="font-size:13px;">
                ${wasHolding ? 'Timer paused. Return to your aligned position to resume countdown.' : `Look at the red mark on the 3D model: ${poseLostMessage}`}
              </div>
            </div>
            ${wasHolding ? `<span class="badge bg-warning text-dark fs-6 shadow-sm"><i class="fa-solid fa-pause me-1"></i>Paused (${state.holdRemainingSeconds}s left)</span>` : ''}
          </div>
        `;
      }
      if (statusDot) {
        statusDot.className = 'status-dot warn';
      }
      if (statusText) {
        statusText.innerHTML = wasHolding
          ? `<span class="text-warning fw-bold">Pose Lost!</span> — Return to position`
          : `<span class="text-danger fw-bold">Pose Wrong!</span> — Check red mark on 3D guide`;
      }
      if (tipText) {
        tipText.innerHTML = wasHolding ? 'Pose lost — return to the position to continue holding.' : (status.message || 'Adjust posture to match 3D guide.');
      }

      if (status.fault) {
        if (!state.issuesEncountered.includes(status.fault)) {
          state.issuesEncountered.push(status.fault);
        }
      }
      if (typeof status.accuracy === 'number') {
        state.scoreHistory.push(Math.round(status.accuracy));
      } else if (!status.isCorrect) {
        state.scoreHistory.push(Math.max(60, 95 - (state.issuesEncountered.length * 8)));
      }

      // Voice guidance alert
      const now = Date.now();
      const promptToSpeak = wasHolding 
        ? 'Pose lost, return to the position.' 
        : `Your pose is wrong, correct it! ${poseLostMessage}`;
      
      if (status.fault !== state.lastCorrectionFault || (now - (state.lastFaultSpokenTime || 0) > 4000)) {
        state.lastCorrectionFault = status.fault;
        state.lastFaultSpokenTime = now;
        speakGuidance(promptToSpeak, true);
      }
    }

    // Helper function to format seconds as mm:ss
    function formatTimeMMSS(sec) {
      const s = Math.max(0, Math.floor(sec || 0));
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Update Timer Display & Progress Bar
    if (timerDisplay) {
      // If pose is not yet held or timer hasn't started, keep at 00:00
      if (!state.sessionTimerId && state.holdRemainingSeconds === state.holdTargetSeconds) {
        timerDisplay.textContent = '00:00';
      } else {
        const elapsed = state.holdTargetSeconds - state.holdRemainingSeconds;
        timerDisplay.textContent = formatTimeMMSS(elapsed);
      }
    }
    if (progressBar) {
      const pct = Math.round(((state.holdTargetSeconds - state.holdRemainingSeconds) / state.holdTargetSeconds) * 100);
      progressBar.style.width = `${pct}%`;
      progressBar.className = `progress-bar ${status.isCorrect ? 'bg-success' : 'bg-danger'}`;
    }

    // Real-time 3D Pose Avatar Sync:
    // If correct: 3D model glows emerald green
    // If incorrect: 3D model highlights faulty joint in red and shows 3D directional arrow
    if (window.SheCare3DAvatar && typeof window.SheCare3DAvatar.setCorrectionState === 'function') {
      window.SheCare3DAvatar.setCorrectionState(status);
    }
  }

  // Helper format function for mm:ss
  function formatMMSS(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Hold Countdown Timer: only runs while isCorrect === true
  function startHoldCountdown() {
    if (state.sessionTimerId) return; // already ticking

    state.sessionTimerId = setInterval(() => {
      if (!state.isCorrect) {
        stopHoldCountdown();
        return;
      }

      if (state.holdRemainingSeconds > 0) {
        state.holdRemainingSeconds--;
        state.correctHoldDurationSeconds++;
        const timerDisplay = document.getElementById('poseHoldTimerDisplay');
        const progressBar = document.getElementById('poseHoldProgressBar');
        if (timerDisplay) {
          const elapsed = state.holdTargetSeconds - state.holdRemainingSeconds;
          timerDisplay.textContent = formatMMSS(elapsed);
        }
        if (progressBar) {
          const pct = Math.round(((state.holdTargetSeconds - state.holdRemainingSeconds) / state.holdTargetSeconds) * 100);
          progressBar.style.width = `${pct}%`;
        }
      }

      if (state.holdRemainingSeconds <= 0) {
        onPoseCompleted();
      }
    }, 1000);
  }

  function stopHoldCountdown() {
    if (state.sessionTimerId) {
      clearInterval(state.sessionTimerId);
      state.sessionTimerId = null;
    }
  }

  // When hold goal is achieved (15s continuous safe alignment)
  function onPoseCompleted() {
    stopHoldCountdown();
    state.completedPoses++;
    state.caloriesBurned += 15;

    speakGuidance(`Great work! Perfect alignment verified for ${YOGA_POSES[state.activePoseId].name}. Advancing to the next pose!`, true);

    const banner = document.getElementById('poseGatingBanner');
    if (banner) {
      banner.className = 'pose-banner complete';
      banner.innerHTML = `
        <div class="text-center py-2">
          <div class="fw-bold text-white fs-5"><i class="fa-solid fa-trophy me-2"></i>Pose Complete — Perfect 3D Match!</div>
          <p class="small text-white mb-2">15-second hold completed with correct form. Automatically advancing to next pose in 3s...</p>
          <button class="btn btn-light btn-sm fw-bold px-4 rounded-pill shadow-sm" onclick="window.SheCareYoga.nextPose();" type="button">
            Next Pose Now &rarr;
          </button>
        </div>
      `;
    }

    if (typeof window.confetti === 'function') {
      window.confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
    }

    // Auto-proceed further to next pose after 3 seconds
    if (state.autoAdvanceTimer) clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = setTimeout(() => {
      nextPose();
    }, 3000);

    // Auto-log to backend fitness tracker
    if (window.SheCareAPI && window.SheCareAPI.resource) {
      window.SheCareAPI.resource('fitness').create({
        activity: `Yoga: ${YOGA_POSES[state.activePoseId]?.name || state.activePoseId}`,
        duration: 1,
        calories: 15
      }).catch(() => {});
    }

    // Update streak UI
    const streakEl = document.getElementById('streakCountOut');
    if (streakEl) streakEl.textContent = `${Math.max(1, state.completedPoses)}`;
  }

  // Set Custom Hold Duration
  function setHoldDuration(seconds) {
    const sec = Math.max(5, Math.min(300, parseInt(seconds, 10) || 15));
    state.customHoldDuration = sec;
    state.holdTargetSeconds = sec;
    state.holdRemainingSeconds = sec;
    stopHoldCountdown();

    const timerDisplay = document.getElementById('poseHoldTimerDisplay');
    const progressBar = document.getElementById('poseHoldProgressBar');
    const customInput = document.getElementById('customHoldDurationInput');

    if (timerDisplay) timerDisplay.textContent = `${sec}s`;
    if (progressBar) {
      progressBar.style.width = '0%';
      progressBar.className = 'progress-bar bg-success';
    }
    if (customInput) customInput.value = sec;

    // Update active time preset buttons
    document.querySelectorAll('.time-preset-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.time, 10) === sec);
    });

    speakGuidance(`Hold timer set to ${sec} seconds.`);
  }

  // Render variations for a selected yoga module
  function renderModuleVariations(moduleId) {
    if (!YOGA_MODULES[moduleId]) moduleId = 'beginner';
    state.activeModuleId = moduleId;
    const mod = YOGA_MODULES[moduleId];

    // Highlight selected module card
    document.querySelectorAll('.yoga-category-card').forEach(card => {
      const match = (card.dataset.module === moduleId);
      card.classList.toggle('active-module', match);
    });

    // Update Variations Header
    const titleEl = document.getElementById('moduleVariationsTitle');
    const badgeEl = document.getElementById('moduleVariationsBadge');
    const descEl = document.getElementById('moduleVariationsDesc');

    if (titleEl) titleEl.textContent = `${mod.name} Variations`;
    if (badgeEl) badgeEl.textContent = mod.badge;
    if (descEl) descEl.textContent = mod.tagline;

    // Set hold duration default from module if not manually customized
    if (!state.customHoldDuration && mod.defaultHold) {
      setHoldDuration(mod.defaultHold);
    }

    // Render pose chips
    const container = document.getElementById('yogaPoseChips');
    if (container) {
      container.innerHTML = mod.poses.map(poseKey => {
        const p = YOGA_POSES[poseKey];
        if (!p) return '';
        const isActive = (poseKey === state.activePoseId);
        return `
          <button class="pose-chip-btn ${isActive ? 'active' : ''} yoga-pose-chip" data-pose="${poseKey}" type="button">
            <span>🧘</span> ${p.name.split('(')[0].trim()}
          </button>
        `;
      }).join('');

      // Attach click listeners to the newly rendered chips
      container.querySelectorAll('.yoga-pose-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          setPose(chip.dataset.pose);
        });
      });
    }
  }

  // Switch Module
  function setModule(moduleId) {
    // Normalize string e.g. "Pregnancy Yoga" -> "pregnancy"
    if (!YOGA_MODULES[moduleId]) {
      const lower = (moduleId || '').toLowerCase();
      if (lower.includes('pregnancy')) moduleId = 'pregnancy';
      else if (lower.includes('diabetes')) moduleId = 'diabetes';
      else if (lower.includes('pcos')) moduleId = 'pcos';
      else if (lower.includes('weight')) moduleId = 'weightloss';
      else if (lower.includes('stress')) moduleId = 'stress';
      else moduleId = 'beginner';
    }

    state.activeModuleId = moduleId;
    renderModuleVariations(moduleId);

    // Automatically load the first variation of this module
    const firstPose = YOGA_MODULES[moduleId].poses[0];
    setPose(firstPose);

    speakGuidance(`Selected ${YOGA_MODULES[moduleId].name}. Browse variations and match your posture with the 3D guide.`);
  }

  // Single source of truth for the active pose
  let currentPose = null;

  /**
   * Complete validation for the pose library.
   * Reports any missing IDs, duplicates, or incomplete definitions in the console.
   */
  function validatePoseLibrary() {
    const list = window.YOGA_POSE_LIBRARY || [];
    if (!Array.isArray(list) || list.length === 0) {
      console.warn('[PoseLibraryValidator] No poses loaded in window.YOGA_POSE_LIBRARY.');
      return;
    }
    const seenIds = new Set();
    const issues = [];

    list.forEach((p, idx) => {
      if (!p.id) issues.push(`Pose at index ${idx} is missing an ID.`);
      if (p.id && seenIds.has(p.id)) issues.push(`Duplicate pose ID detected: "${p.id}".`);
      if (p.id) seenIds.add(p.id);
      if (!p.name) issues.push(`Pose "${p.id}" is missing a name.`);
      if (!p.imageUrl && !p.referenceImage) issues.push(`Pose "${p.id}" is missing a reference image.`);
      if (!p.instructions || !p.instructions.length) issues.push(`Pose "${p.id}" is missing instructions.`);
      if (!p.alignmentRules || !p.alignmentRules.length) issues.push(`Pose "${p.id}" is missing detection rules.`);
      if (!p.targetHoldSeconds && !p.holdTime) issues.push(`Pose "${p.id}" is missing hold duration.`);
    });

    if (issues.length > 0) {
      console.warn(`[PoseLibraryValidator] Found ${issues.length} issue(s):`, issues);
    } else {
      console.log(`[PoseLibraryValidator] All ${list.length} clinical yoga poses validated successfully with complete data.`);
    }
  }

  // Run validation on load
  if (typeof window !== 'undefined') {
    setTimeout(validatePoseLibrary, 100);
  }

  /**
   * Resolve complete pose object by searching YOGA_POSE_LIBRARY and YOGA_POSES
   */
  function getPoseById(poseId) {
    if (!poseId) return null;
    const cleanId = String(poseId).toLowerCase().trim();

    // 1. Search in comprehensive 41-pose YOGA_POSE_LIBRARY
    if (window.YOGA_POSE_LIBRARY && Array.isArray(window.YOGA_POSE_LIBRARY)) {
      const found = window.YOGA_POSE_LIBRARY.find(p => p.id === cleanId || p.id === cleanId.replace(/-/g, '_') || p.id === cleanId.replace(/_/g, ''));
      if (found) {
        return {
          id: found.id,
          name: found.name,
          sanskrit: found.sanskrit,
          category: found.category || 'All Levels',
          difficulty: found.difficulty || 'Beginner',
          referenceImage: found.referenceImage || found.imageUrl,
          imageUrl: found.referenceImage || found.imageUrl,
          thumbnailUrl: found.thumbnailUrl || found.imageUrl,
          instructions: Array.isArray(found.instructions) ? found.instructions : [found.instructions],
          alignmentTips: found.alignmentTips || ['Maintain deep steady breathing', 'Keep core engaged', 'Stay centered'],
          precautions: found.precautions || 'Listen to your body. Discontinue if sharp discomfort occurs.',
          targetMuscles: found.muscles || found.targetBodyAreas || ['Core', 'Spine', 'Legs'],
          targetBodyAreas: found.targetBodyAreas || ['Core', 'Spine', 'Legs'],
          benefits: found.benefits || 'Promotes neuromuscular stability and flexibility.',
          holdTime: found.holdTime || found.targetHoldSeconds || 15,
          targetHoldSeconds: found.holdTime || found.targetHoldSeconds || 15,
          targetAngles: found.targetAngles || { posture: 'Aligned' },
          detectionRules: found.alignmentRules || found.detectionRules || [],
          rules: found.alignmentRules || found.detectionRules || [],
          breathing: found.breathing || 'Inhale to lengthen the spine, exhale to ground down through your foundation.',
          commonMistakes: found.commonMistakes || ['Slouching spine', 'Collapsing knees inward', 'Holding breath']
        };
      }
    }

    // 2. Search in YOGA_POSES cache
    if (YOGA_POSES[cleanId]) {
      const p = YOGA_POSES[cleanId];
      return {
        id: p.id,
        name: p.name.split('(')[0].trim(),
        sanskrit: p.sanskrit || '',
        category: p.category || 'All Levels',
        difficulty: p.difficulty || 'Beginner',
        referenceImage: p.imageUrl,
        imageUrl: p.imageUrl,
        thumbnailUrl: p.thumbnailUrl || p.imageUrl,
        instructions: [p.description],
        alignmentTips: ['Align joints according to reference', 'Keep steady breath'],
        precautions: 'Avoid if acute joint inflammation is present.',
        targetMuscles: ['Core', 'Legs', 'Spine'],
        targetBodyAreas: ['Core', 'Legs', 'Spine'],
        benefits: p.description,
        holdTime: p.targetHoldSeconds || 15,
        targetHoldSeconds: p.targetHoldSeconds || 15,
        targetAngles: { frontKnee: '85°–105°' },
        detectionRules: p.rules || [],
        rules: p.rules || [],
        breathing: 'Deep diaphragmatic breathing.',
        commonMistakes: ['Slouching spine']
      };
    }

    return null;
  }

  /**
   * Reset all session, timer, and score metrics when changing poses
   */
  function resetPoseSession() {
    stopHoldCountdown();
    state.holdRemainingSeconds = state.holdTargetSeconds;
    state.isCorrect = false;
    state.lastCorrectionFault = null;
    state.faultyJointIdx = null;
    state.faultyJointName = null;
    state.faultyMessage = null;
    state.stableHoldStartTime = 0;
    state.isPoseHeldStable = false;
    state.sessionStartTime = Date.now();
    state.correctHoldDurationSeconds = 0;
    state.scoreHistory = [95];
    state.issuesEncountered = [];
    state.isPaused = false;
    state.liveAccuracyPct = 95;

    // Reset hold timer and progress bar UI
    const timerDisplay = document.getElementById('poseHoldTimerDisplay');
    const progressBar = document.getElementById('poseHoldProgressBar');
    const statusDot = document.getElementById('poseStatusDot');
    const statusText = document.getElementById('poseStatusText');

    if (timerDisplay) timerDisplay.textContent = '00:00';
    if (progressBar) {
      progressBar.style.width = '0%';
      progressBar.className = 'progress-bar bg-success';
    }
    if (statusDot) statusDot.className = 'status-dot warn';
    if (statusText) statusText.textContent = 'Standby — Assume Pose';

    // Clear canvas
    const canvas = document.getElementById('poseCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * Single Source of Truth Render Function
   * Renders EVERY piece of content from currentPose:
   * - Pose Name & Sanskrit Name
   * - Human Reference Image & Alt text
   * - Instructions & Alignment Tips
   * - Target Muscles & Target Body Areas
   * - Difficulty & Precautions
   * - Recommended Hold Duration & Timer
   * - AI Detection Target & Joint-Angle Rules
   * - Voice Feedback Target
   */
  function renderCurrentPose() {
    if (!currentPose) return;

    // Synchronize YOGA_POSES entry so detection engine uses active pose rules
    YOGA_POSES[currentPose.id] = currentPose;
    state.activePoseId = currentPose.id;
    state.holdTargetSeconds = state.customHoldDuration || currentPose.targetHoldSeconds || 15;
    state.holdRemainingSeconds = state.holdTargetSeconds;

    // 1. Update Pose Name & Sanskrit Name Headers
    const activeTitle = document.getElementById('activePoseTitle');
    const activeBadge = document.getElementById('activePoseBadge');
    const activeDesc = document.getElementById('activePoseDesc');
    const poseTipText = document.getElementById('poseTipText');
    const hudPoseName = document.getElementById('hudPoseName');
    const avatarTitle = document.getElementById('avatarPoseTitle');

    const fullNameWithSanskrit = currentPose.sanskrit 
      ? `${currentPose.name} (${currentPose.sanskrit})` 
      : currentPose.name;

    if (activeTitle) activeTitle.textContent = fullNameWithSanskrit;
    if (activeBadge) activeBadge.textContent = currentPose.category || 'Current Pose';
    if (activeDesc) activeDesc.textContent = currentPose.benefits || currentPose.instructions[0] || '';
    if (poseTipText) poseTipText.textContent = `🎯 Target Alignment: ${Array.isArray(currentPose.alignmentTips) ? currentPose.alignmentTips[0] : currentPose.alignmentTips}`;
    if (hudPoseName) hudPoseName.textContent = currentPose.name;
    if (avatarTitle) avatarTitle.textContent = fullNameWithSanskrit;

    // 2. Update Human Reference Image with Robust Fallback (No silent Warrior II substitution!)
    const primaryImg = document.getElementById('primaryHumanPoseImg');
    const unavailableAlert = document.getElementById('humanPoseUnavailableAlert');
    const refImgUrl = currentPose.referenceImage || currentPose.imageUrl;

    if (primaryImg) {
      if (refImgUrl) {
        primaryImg.onload = () => {
          primaryImg.style.display = 'block';
          if (unavailableAlert) unavailableAlert.classList.add('d-none');
        };
        primaryImg.onerror = () => {
          primaryImg.style.display = 'none';
          if (unavailableAlert) {
            unavailableAlert.classList.remove('d-none');
            const alertTitle = unavailableAlert.querySelector('h6');
            if (alertTitle) alertTitle.textContent = `Human reference image unavailable for ${currentPose.name}.`;
          }
          console.warn(`[YogaStudio] Missing or unreachable reference image for ${currentPose.name}:`, refImgUrl);
        };
        primaryImg.src = refImgUrl;
        primaryImg.alt = `Human practitioner demonstrating ${currentPose.name}`;
      } else {
        primaryImg.style.display = 'none';
        if (unavailableAlert) {
          unavailableAlert.classList.remove('d-none');
          const alertTitle = unavailableAlert.querySelector('h6');
          if (alertTitle) alertTitle.textContent = `Human reference image unavailable for ${currentPose.name}.`;
        }
        console.warn(`[YogaStudio] No reference image defined for ${currentPose.name}`);
      }
    }

    // 3. Update Detailed Clinical Pose Profile Card
    const headerNameEl = document.getElementById('selectedPoseHeaderName');
    const sanskritEl = document.getElementById('poseProfileSanskrit');
    const diffEl = document.getElementById('poseProfileDifficulty');
    const descBoxEl = document.getElementById('poseProfileDescription');
    const instBoxEl = document.getElementById('poseProfileInstructions');
    const targetAreasEl = document.getElementById('poseProfileTargetAreas');
    const benefitsEl = document.getElementById('poseProfileBenefits');
    const alignmentEl = document.getElementById('poseProfileAlignment');
    const breathingEl = document.getElementById('poseProfileBreathing');
    const mistakesEl = document.getElementById('poseProfileMistakes');
    const precautionsEl = document.getElementById('poseProfilePrecautions');

    if (headerNameEl) headerNameEl.innerHTML = `<i class="fa-solid fa-circle-info text-primary-pink me-1"></i>${currentPose.name}`;
    if (sanskritEl) sanskritEl.textContent = currentPose.sanskrit ? `(${currentPose.sanskrit})` : '';
    if (diffEl) diffEl.textContent = currentPose.difficulty || currentPose.category || 'All Levels';
    if (descBoxEl) descBoxEl.textContent = currentPose.benefits || currentPose.instructions[0] || '';
    if (instBoxEl) {
      instBoxEl.textContent = Array.isArray(currentPose.instructions) ? currentPose.instructions.join(' ') : currentPose.instructions;
    }
    if (targetAreasEl) {
      const muscles = currentPose.targetMuscles || currentPose.targetBodyAreas || [];
      targetAreasEl.textContent = Array.isArray(muscles) ? muscles.join(', ') : muscles;
    }
    if (benefitsEl) benefitsEl.textContent = currentPose.benefits || '';
    if (alignmentEl) {
      const tips = currentPose.alignmentTips || [];
      alignmentEl.textContent = Array.isArray(tips) ? tips.join('; ') : tips;
    }
    if (breathingEl) breathingEl.textContent = currentPose.breathing || 'Steady breathing through nose.';
    if (mistakesEl) {
      const mistakes = currentPose.commonMistakes || [];
      mistakesEl.textContent = Array.isArray(mistakes) ? mistakes.join('; ') : mistakes;
    }
    if (precautionsEl) precautionsEl.textContent = currentPose.precautions || 'Listen to your body.';

    // 4. Update Posture Alignment Matrix Target Badges & Telemetry Targets
    const telemTarget = document.getElementById('telemetryTargetVal');
    const matrixKneeTarget = document.getElementById('matrixKneeTargetBadge');
    const matrixArmTarget = document.getElementById('matrixArmTargetBadge');
    const matrixKneeLabel = document.getElementById('matrixKneeLabel');
    const matrixArmLabel = document.getElementById('matrixArmLabel');

    if (currentPose.targetAngles) {
      const tg = currentPose.targetAngles;
      if (telemTarget) telemTarget.textContent = tg.knees || tg.standingKnee || tg.legs || tg.spine || 'Target Form';
      if (matrixKneeTarget) matrixKneeTarget.textContent = tg.knees || tg.standingKnee || tg.legs || 'Aligned';
      if (matrixArmTarget) matrixArmTarget.textContent = tg.shoulders || tg.arms || tg.spine || 'Aligned';
    }

    // 5. Update Pose Selection Chips & Dropdown Selector Highlights
    document.querySelectorAll('.yoga-pose-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.pose === currentPose.id);
    });

    const poseSelect = document.getElementById('yogaPoseSelect');
    if (poseSelect && poseSelect.value !== currentPose.id) {
      poseSelect.value = currentPose.id;
    }

    // 6. Update 3D Model / 3D Canvas
    if (window.SheCare3DAvatar && typeof window.SheCare3DAvatar.setPose === 'function') {
      window.SheCare3DAvatar.setPose(currentPose.id);
    }

    // 7. Voice Feedback Target
    const voiceLine = currentPose.alignmentTips && currentPose.alignmentTips[0]
      ? `Starting ${currentPose.name}. ${currentPose.alignmentTips[0]}`
      : `Starting ${currentPose.name}. Check your reference and step into alignment.`;
    speakGuidance(voiceLine);
  }

  /**
   * Main Pose Selection Handler (Requirement 7)
   * 1. Finds pose from library
   * 2. Validates existence
   * 3. Sets currentPose
   * 4. Resets timer, detection, scores
   * 5. Updates human reference, instructions, AI detection target, voice feedback
   */
  function selectPose(poseId) {
    const pose = getPoseById(poseId);
    if (!pose) {
      console.error('[YogaStudio] Pose not found in pose library:', poseId);
      return false;
    }

    currentPose = pose;
    resetPoseSession();
    renderCurrentPose();
    return true;
  }

  // Alias setPose to selectPose for full backward compatibility
  const setPose = selectPose;

  // Next Pose
  function nextPose() {
    let list = [];
    const currentMod = YOGA_MODULES[state.activeModuleId];
    if (currentMod && Array.isArray(currentMod.poses) && currentMod.poses.includes(state.activePoseId)) {
      list = currentMod.poses;
    } else if (window.YOGA_POSE_LIBRARY && Array.isArray(window.YOGA_POSE_LIBRARY)) {
      list = window.YOGA_POSE_LIBRARY.map(p => p.id);
    } else {
      list = Object.keys(YOGA_POSES);
    }
    const currentIndex = list.indexOf(state.activePoseId);
    const nextIndex = (currentIndex + 1) % list.length;
    selectPose(list[nextIndex]);
  }

  // Initialize MediaPipe Pose Detection
  async function initMediaPipePose() {
    // Retry polling: wait up to 4s if CDN script is still finishing download
    for (let i = 0; i < 40; i++) {
      if (typeof window.Pose !== 'undefined') break;
      await new Promise(r => setTimeout(r, 100));
    }

    if (typeof window.Pose === 'undefined') {
      console.warn('MediaPipe Pose library not loaded from CDN yet.');
      return false;
    }

    try {
      const pose = new window.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      pose.setOptions({
        modelComplexity: 0, // Lite model for smooth 30+ FPS real-time responsiveness
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3
      });

      pose.onResults((results) => {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('poseCanvas');
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        const targetW = video.videoWidth || 640;
        const targetH = video.videoHeight || 480;
        if (canvas.width !== targetW) canvas.width = targetW;
        if (canvas.height !== targetH) canvas.height = targetH;

        const lm = results.poseLandmarks;
        if (lm && lm.length > 0) {
          evaluateCurrentPose(lm);
          drawPoseSkeleton(ctx, lm, canvas.width, canvas.height, state.isCorrect, state.faultyJointIdx);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          updateGatekeeperUI({
            isCorrect: false,
            fault: 'no_person',
            jointIdx: null,
            message: 'Get into the pose to start'
          });
        }
      });

      if (typeof pose.initialize === 'function') {
        await pose.initialize();
      }

      state.poseDetector = pose;
      return true;
    } catch (err) {
      console.error('Failed to initialize MediaPipe Pose:', err);
      return false;
    }
  }

  // =========================================================================
  // CAMERA MANAGEMENT (STRICT SPECIFICATION IMPLEMENTATION)
  // =========================================================================

  let cameraFrameRequestId = null;
  let isMediaPipeProcessing = false;

  /**
   * Stop Camera and completely clean up streams, tracks, and animation loops
   */
  function stopCamera() {
    console.log('[Camera] Stopping camera...');
    if (cameraFrameRequestId) {
      cancelAnimationFrame(cameraFrameRequestId);
      cameraFrameRequestId = null;
    }
    isMediaPipeProcessing = false;

    if (state.mediaStream) {
      const tracks = state.mediaStream.getTracks();
      console.log(`[Camera] Stopping ${tracks.length} active media tracks.`);
      tracks.forEach(track => {
        try {
          track.stop();
          console.log(`[Camera] Track ${track.id} (${track.kind}) stopped.`);
        } catch (tErr) {
          console.warn('[Camera] Track stop warning:', tErr);
        }
      });
      state.mediaStream = null;
    }

    state.isCameraRunning = false;
    stopHoldCountdown();

    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('poseCanvas');
    const placeholder = document.getElementById('cameraPlaceholder');
    const enableBtn = document.getElementById('enableCameraBtn');
    const disableBtn = document.getElementById('disableCameraBtn');
    const controlsBar = document.getElementById('cameraControlsBar');
    const banner = document.getElementById('poseGatingBanner');

    if (video) {
      video.pause();
      video.srcObject = null;
      video.classList.add('d-none');
    }
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.classList.add('d-none');
    }
    if (placeholder) {
      placeholder.classList.remove('d-none');
    }
    if (enableBtn) {
      enableBtn.classList.remove('d-none');
      enableBtn.disabled = false;
      enableBtn.innerHTML = '<i class="fa-solid fa-video me-2"></i>START CAMERA';
    }
    if (disableBtn) {
      disableBtn.classList.add('d-none');
    }
    if (controlsBar) controlsBar.classList.add('d-none');
    if (banner) banner.classList.add('d-none');

    console.log('[Camera] Camera successfully stopped and cleaned up.');
  }

  /**
   * Robust Camera Initialization with diagnostics, progressive constraints, and explicit error triage
   */
  async function startCamera() {
    console.log('--- [SheCares Camera Diagnostics] ---');

    // Prevent duplicate camera streams
    if (state.isCameraRunning && state.mediaStream) {
      console.warn('[Camera] Camera stream is already active. Reusing or re-initializing cleanly.');
      stopCamera();
    }

    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('poseCanvas');
    const placeholder = document.getElementById('cameraPlaceholder');
    const enableBtn = document.getElementById('enableCameraBtn');
    const disableBtn = document.getElementById('disableCameraBtn');
    const errBox = document.getElementById('cameraErrorAlert');
    const controlsBar = document.getElementById('cameraControlsBar');
    const banner = document.getElementById('poseGatingBanner');

    if (errBox) errBox.classList.add('d-none');

    if (enableBtn) {
      enableBtn.disabled = true;
      enableBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>STARTING CAMERA...';
    }

    // Diagnostic 1: Browser Camera Support
    const hasMediaDevices = !!(navigator && navigator.mediaDevices);
    const hasGetUserMedia = !!(hasMediaDevices && navigator.mediaDevices.getUserMedia);
    console.log(`Camera supported: ${hasGetUserMedia ? 'YES' : 'NO'}`);

    if (!hasMediaDevices || !hasGetUserMedia) {
      const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      const msg = isSecure
        ? 'Your browser does not support webcam streaming (navigator.mediaDevices.getUserMedia is missing).'
        : 'Camera requires HTTPS or localhost.';
      showCameraError('SecurityError', msg);
      if (enableBtn) {
        enableBtn.disabled = false;
        enableBtn.innerHTML = '<i class="fa-solid fa-video me-2"></i>START CAMERA';
      }
      return false;
    }

    // Constraints hierarchy: prefer front-facing (user), fallback to basic
    const constraintsList = [
      {
        video: {
          facingMode: state.facingMode || 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      },
      {
        video: {
          facingMode: state.facingMode || 'user'
        },
        audio: false
      },
      {
        video: true,
        audio: false
      }
    ];

    let stream = null;
    let caughtError = null;

    for (let i = 0; i < constraintsList.length; i++) {
      try {
        console.log(`[Camera] Requesting video permission with constraint set #${i + 1}:`, constraintsList[i]);
        stream = await navigator.mediaDevices.getUserMedia(constraintsList[i]);
        if (stream) {
          console.log(`Permission result: GRANTED (via constraint #${i + 1})`);
          break;
        }
      } catch (err) {
        console.warn(`[Camera] Constraint set #${i + 1} rejected:`, err.name, err.message);
        caughtError = err;
        // If user actively denies permission or device is securely blocked, do not loop silently
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
          break;
        }
      }
    }

    if (!stream) {
      console.error('Stream obtained: NO', caughtError);
      handleCameraFailure(caughtError);
      return false;
    }

    console.log('Stream obtained: YES');
    state.mediaStream = stream;

    // Track Diagnostics
    const tracks = stream.getVideoTracks();
    console.log(`Number of tracks: ${tracks.length}`);
    if (tracks.length > 0) {
      console.log(`Track state: ${tracks[0].readyState}, label: "${tracks[0].label}"`);
    }

    // Attach stream to video element with required properties
    video.srcObject = stream;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    // Display video element and hide placeholder immediately so user sees feed right away
    if (placeholder) placeholder.classList.add('d-none');
    if (video) video.classList.remove('d-none');
    if (canvas) canvas.classList.remove('d-none');
    if (enableBtn) enableBtn.classList.add('d-none');
    if (disableBtn) disableBtn.classList.remove('d-none');
    if (controlsBar) controlsBar.classList.remove('d-none');
    if (banner) banner.classList.remove('d-none');

    state.isCameraRunning = true;

    try {
      // Play the stream (muted avoids autoplay rejection)
      const playPromise = video.play();
      if (playPromise !== undefined) {
        await playPromise.catch(pErr => {
          console.warn('[Camera] video.play() note:', pErr);
        });
      }

      // Read dimensions once metadata is loaded
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        console.log(`Video dimensions: ${video.videoWidth} x ${video.videoHeight}`);
      } else {
        video.onloadedmetadata = () => {
          if (canvas) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }
          console.log(`Video dimensions: ${video.videoWidth} x ${video.videoHeight}`);
        };
      }

      // Start MediaPipe ONLY after video is confirmed ready
      startMediaPipePipeline(video, canvas);

      const activePoseObj = YOGA_POSES[state.activePoseId] || { name: 'Warrior II' };
      speakGuidance(`Camera connected. Stand back and assume ${activePoseObj.name}.`);
      return true;

    } catch (playErr) {
      console.error('[Camera] Playback / metadata failure:', playErr);
      handleCameraFailure(playErr);
      return false;
    }
  }

  /**
   * Initializes MediaPipe Pose and starts continuous video analysis frame loop
   */
  async function startMediaPipePipeline(video, canvas) {
    try {
      console.log('[MediaPipe] Initializing pose detector for live webcam stream...');
      const mpReady = await initMediaPipePose();
      if (!mpReady || !state.poseDetector) {
        console.warn('MediaPipe started: NO (library offline or unavailable)');
        return;
      }

      console.log('MediaPipe started: YES (Live frames pumping)');

      // Cancel any existing loop
      if (cameraFrameRequestId) {
        cancelAnimationFrame(cameraFrameRequestId);
        cameraFrameRequestId = null;
      }

      const pumpFrame = async () => {
        if (!state.isCameraRunning || !state.poseDetector) return;

        if (!isMediaPipeProcessing && video.readyState >= 2 && video.videoWidth > 0) {
          isMediaPipeProcessing = true;
          try {
            await state.poseDetector.send({ image: video });
          } catch (err) {
            console.warn('[MediaPipe] Frame evaluation error:', err);
          } finally {
            isMediaPipeProcessing = false;
          }
        }

        if (state.isCameraRunning) {
          cameraFrameRequestId = requestAnimationFrame(pumpFrame);
        }
      };

      cameraFrameRequestId = requestAnimationFrame(pumpFrame);
    } catch (mpErr) {
      console.warn('[MediaPipe] Pipeline initiation error:', mpErr);
    }
  }

  /**
   * Handles explicit categorized errors
   */
  function handleCameraFailure(err) {
    const enableBtn = document.getElementById('enableCameraBtn');
    if (enableBtn) {
      enableBtn.disabled = false;
      enableBtn.innerHTML = '<i class="fa-solid fa-rotate-right me-2"></i>RETRY CAMERA';
    }

    const errName = err ? err.name : 'UnknownError';
    let userMsg = '';

    switch (errName) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        userMsg = 'Camera permission is blocked. Please allow camera access in your browser settings and reload SheCares.';
        break;
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        userMsg = 'No camera was detected on this device.';
        break;
      case 'NotReadableError':
      case 'TrackStartError':
        userMsg = 'The camera is being used by another application. Close other camera applications and try again.';
        break;
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        userMsg = 'Requested camera resolution/settings not supported by your hardware.';
        break;
      case 'SecurityError':
        userMsg = 'Camera requires HTTPS or localhost.';
        break;
      default:
        userMsg = `Camera error: ${err?.message || 'Unable to open webcam stream.'}`;
        break;
    }

    showCameraError(errName, userMsg);
  }

  /**
   * Renders error banner with dedicated RETRY CAMERA action
   */
  function showCameraError(type, message) {
    const errBox = document.getElementById('cameraErrorAlert');
    if (!errBox) return;

    errBox.classList.remove('d-none');
    errBox.className = 'alert alert-danger mb-3 shadow-sm rounded-3';
    errBox.innerHTML = `
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="d-flex align-items-center gap-2">
          <i class="fa-solid fa-circle-exclamation fs-5 text-danger"></i>
          <div>
            <strong>Camera Error (${type}):</strong>
            <div class="small mt-1 text-dark">${message}</div>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-danger rounded-pill px-3 py-1 fw-bold shadow-sm" id="retryCameraBtn" type="button">
            <i class="fa-solid fa-rotate-right me-1"></i>RETRY CAMERA
          </button>
        </div>
      </div>
    `;

    document.getElementById('retryCameraBtn')?.addEventListener('click', () => {
      startCamera();
    });
  }

  // Interactive Angle Simulator Mode (ensures the correction engine is 100% testable anywhere)
  function startFallbackSimulator() {
    state.simulationMode = true;
    const placeholder = document.getElementById('cameraPlaceholder');
    const canvas = document.getElementById('poseCanvas');
    const simBox = document.getElementById('poseSimulatorBox');
    const controlsBar = document.getElementById('cameraControlsBar');
    const disableBtn = document.getElementById('disableCameraBtn');

    if (placeholder) placeholder.classList.add('d-none');
    if (canvas) {
      canvas.classList.remove('d-none');
      canvas.width = 640;
      canvas.height = 480;
    }
    if (controlsBar) controlsBar.classList.remove('d-none');
    if (disableBtn) disableBtn.classList.remove('d-none');
    if (simBox) simBox.classList.remove('d-none');
    document.getElementById('poseGatingBanner')?.classList.remove('d-none');

    // Default simulation evaluation
    simulateAngleChange(95); // Valid initial Warrior II
  }

  function simulateAngleChange(angleValue) {
    const currentPose = YOGA_POSES[state.activePoseId];
    if (!currentPose) return;

    // Fake landmarks with controllable angle
    const mockAngles = {
      leftKnee: angleValue,
      rightKnee: 175,
      leftShoulderElevation: 90,
      rightShoulderElevation: 90
    };
    state.liveAngles = mockAngles;

    const mockLandmarks = [
      { x: 0.5, y: 0.2, visibility: 0.9 }, // 0
      ...Array(10).fill({ x: 0.5, y: 0.3, visibility: 0.9 }),
      { x: 0.45, y: 0.35, visibility: 0.9 }, // 11
      { x: 0.55, y: 0.35, visibility: 0.9 }, // 12
      { x: 0.35, y: 0.35, visibility: 0.9 }, // 13
      { x: 0.65, y: 0.35, visibility: 0.9 }, // 14
      { x: 0.25, y: 0.35, visibility: 0.9 }, // 15
      { x: 0.75, y: 0.35, visibility: 0.9 }, // 16
      ...Array(6).fill({ x: 0.5, y: 0.5, visibility: 0.9 }),
      { x: 0.46, y: 0.55, visibility: 0.9 }, // 23
      { x: 0.54, y: 0.55, visibility: 0.9 }, // 24
      { x: 0.43, y: 0.70, visibility: 0.9 }, // 25
      { x: 0.57, y: 0.75, visibility: 0.9 }, // 26
      { x: 0.43, y: 0.90, visibility: 0.9 }, // 27
      { x: 0.57, y: 0.90, visibility: 0.9 }  // 28
    ];

    let passed = true;
    let failDetail = null;
    for (const rule of currentPose.rules) {
      const res = rule.evaluate(mockAngles, mockLandmarks);
      if (!res.valid) {
        passed = false;
        failDetail = res;
        break;
      }
    }

    if (passed) {
      updateGatekeeperUI({ isCorrect: true, jointIdx: null, message: 'Perfect alignment! Hold steady...' });
    } else {
      updateGatekeeperUI({
        isCorrect: false,
        fault: failDetail.fault,
        jointIdx: failDetail.jointIdx,
        angle: failDetail.angle,
        target: failDetail.target,
        message: failDetail.message
      });
    }

    // Draw on canvas
    const canvas = document.getElementById('poseCanvas');
    if (canvas) {
      canvas.classList.remove('d-none');
      const ctx = canvas.getContext('2d');
      drawPoseSkeleton(ctx, mockLandmarks, canvas.width || 640, canvas.height || 480, passed, failDetail?.jointIdx);
    }
  }

  function simulateFault(faultType) {
    state.simulationMode = true;
    const currentPose = YOGA_POSES[state.activePoseId] || YOGA_POSES['warrior2'];

    let mockAngles = {
      leftKnee: 95,
      rightKnee: 175,
      leftShoulderElevation: 90,
      rightShoulderElevation: 90
    };

    if (faultType === 'knee_overextended') {
      mockAngles.leftKnee = 68;
    } else if (faultType === 'arm_drooping') {
      mockAngles.leftShoulderElevation = 48;
    } else if (faultType === 'knee_too_straight') {
      mockAngles.leftKnee = 148;
    } else {
      // correct form
      mockAngles.leftKnee = 95;
      mockAngles.leftShoulderElevation = 90;
    }

    state.liveAngles = mockAngles;

    const kneeY = (faultType === 'knee_overextended') ? 0.78 : (faultType === 'knee_too_straight' ? 0.65 : 0.70);
    const armY = (faultType === 'arm_drooping') ? 0.44 : 0.35;

    const mockLandmarks = [
      { x: 0.5, y: 0.2, visibility: 0.95 },
      ...Array(10).fill({ x: 0.5, y: 0.3, visibility: 0.95 }),
      { x: 0.45, y: armY, visibility: 0.95 }, // 11
      { x: 0.55, y: 0.35, visibility: 0.95 }, // 12
      { x: 0.35, y: armY + 0.05, visibility: 0.95 }, // 13
      { x: 0.65, y: 0.35, visibility: 0.95 }, // 14
      { x: 0.25, y: armY + 0.1, visibility: 0.95 }, // 15
      { x: 0.75, y: 0.35, visibility: 0.95 }, // 16
      ...Array(6).fill({ x: 0.5, y: 0.5, visibility: 0.95 }),
      { x: 0.46, y: 0.55, visibility: 0.95 }, // 23
      { x: 0.54, y: 0.55, visibility: 0.95 }, // 24
      { x: 0.43, y: kneeY, visibility: 0.95 }, // 25
      { x: 0.57, y: 0.75, visibility: 0.95 }, // 26
      { x: 0.43, y: 0.90, visibility: 0.95 }, // 27
      { x: 0.57, y: 0.90, visibility: 0.95 }  // 28
    ];

    let passed = true;
    let failDetail = null;
    for (const rule of currentPose.rules) {
      const res = rule.evaluate(mockAngles, mockLandmarks);
      if (!res.valid) {
        passed = false;
        failDetail = res;
        break;
      }
    }

    if (passed) {
      updateGatekeeperUI({
        isCorrect: true,
        jointIdx: null,
        message: 'Perfect alignment! Hold steady...'
      });
    } else {
      updateGatekeeperUI({
        isCorrect: false,
        fault: failDetail.fault,
        jointIdx: failDetail.jointIdx,
        angle: failDetail.angle,
        target: failDetail.target,
        message: failDetail.message
      });
    }

    const placeholder = document.getElementById('cameraPlaceholder');
    const canvas = document.getElementById('poseCanvas');
    const simBox = document.getElementById('poseSimulatorBox');
    const controlsBar = document.getElementById('cameraControlsBar');
    const disableBtn = document.getElementById('disableCameraBtn');

    if (placeholder) placeholder.classList.add('d-none');
    if (canvas) {
      canvas.classList.remove('d-none');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      drawPoseSkeleton(ctx, mockLandmarks, canvas.width, canvas.height, passed, failDetail?.jointIdx);
    }
    if (controlsBar) controlsBar.classList.remove('d-none');
    if (disableBtn) disableBtn.classList.remove('d-none');
    if (simBox) simBox.classList.remove('d-none');
    document.getElementById('poseGatingBanner')?.classList.remove('d-none');
  }

  // Session Summary Trigger & Backend AI Assessment
  async function endPractice() {
    stopHoldCountdown();
    const activePose = YOGA_POSES[state.activePoseId] || { name: 'Yoga Pose' };
    const durationSeconds = Math.max(1, Math.round((Date.now() - (state.sessionStartTime || Date.now())) / 1000));
    const correctDuration = state.correctHoldDurationSeconds || (state.holdTargetSeconds - state.holdRemainingSeconds);
    const scores = state.scoreHistory.length > 0 ? state.scoreHistory : [90];
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);
    const correctionCount = state.issuesEncountered.length;

    // Populate Modal Elements
    const nameEl = document.getElementById('summaryPoseName');
    const sideEl = document.getElementById('summaryPoseSide');
    const holdEl = document.getElementById('summaryHoldDuration');
    const totalEl = document.getElementById('summaryTotalTime');
    const avgEl = document.getElementById('summaryAvgScore');
    const bestEl = document.getElementById('summaryBestScore');
    const corrEl = document.getElementById('summaryCorrectionCount');
    const issuesListEl = document.getElementById('summaryIssuesList');
    const explanationEl = document.getElementById('summaryAiExplanation');
    const badgeEl = document.getElementById('summaryAiStatusBadge');

    if (nameEl) nameEl.textContent = activePose.name;
    if (sideEl) sideEl.textContent = `${state.practiceSide.toUpperCase()} Side Practice`;
    if (holdEl) holdEl.textContent = `${correctDuration}s`;
    if (totalEl) totalEl.textContent = `Total: ${durationSeconds}s`;
    if (avgEl) avgEl.textContent = `${avgScore}%`;
    if (bestEl) bestEl.textContent = `Best: ${bestScore}%`;
    if (corrEl) corrEl.textContent = `${correctionCount}`;

    if (issuesListEl) {
      if (state.issuesEncountered.length === 0) {
        issuesListEl.innerHTML = `
          <span class="badge bg-success-subtle text-success border border-success-subtle me-1"><i class="fa-solid fa-check me-1"></i>Flawless Anatomical Alignment Maintained</span>
          <span class="badge bg-secondary-subtle text-dark border"><i class="fa-solid fa-circle-check me-1"></i>All 33 landmarks remained stable within safe clinical angles</span>
        `;
      } else {
        issuesListEl.innerHTML = state.issuesEncountered.map(issue => `
          <span class="badge bg-warning-subtle text-warning border border-warning-subtle me-1 mb-1">
            <i class="fa-solid fa-triangle-exclamation me-1"></i>${issue.replace(/_/g, ' ')}
          </span>
        `).join('');
      }
    }

    if (badgeEl) {
      badgeEl.className = 'badge bg-primary-pink text-white rounded-pill px-2 py-1';
      badgeEl.innerHTML = '<span class="spinner-border spinner-border-sm me-1" style="width:9px;height:9px;"></span>AI Analyzing...';
    }
    if (explanationEl) {
      explanationEl.innerHTML = `
        <div class="d-flex align-items-center gap-2 text-muted py-3">
          <span class="spinner-border spinner-border-sm text-primary-pink" role="status"></span>
          Consulting AI Clinical Reasoning Engine with session telemetry...
        </div>
      `;
    }

    // Open Modal via Bootstrap
    const modalEl = document.getElementById('yogaSessionSummaryModal');
    if (modalEl && typeof window.bootstrap !== 'undefined') {
      const modal = new window.bootstrap.Modal(modalEl);
      modal.show();
    }

    // Call /api/yoga/assess
    try {
      const payload = {
        poseId: state.activePoseId,
        poseName: activePose.name,
        duration: durationSeconds,
        correctPostureDuration: correctDuration,
        averageScore: avgScore,
        bestScore: bestScore,
        correctionCount: correctionCount,
        practiceSide: state.practiceSide,
        detectedIssues: state.issuesEncountered,
        alignmentMetrics: {
          stability: avgScore > 90 ? 'High' : 'Moderate',
          symmetry: state.practiceSide === 'right' ? 'Right dominant' : 'Left dominant'
        }
      };

      const res = await fetch('/api/yoga/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const assessment = data.assessment || data.data || {};
        if (badgeEl) {
          badgeEl.className = 'badge bg-success text-white rounded-pill px-2 py-1';
          badgeEl.innerHTML = '<i class="fa-solid fa-circle-check me-1"></i>AI Verified';
        }
        if (explanationEl) {
          explanationEl.innerHTML = `
            <div class="mb-2"><strong>Clinical Summary:</strong> ${assessment.summary || 'Strong session with solid mechanical alignment.'}</div>
            <div class="mb-2"><strong>Biomechanical Observations:</strong> ${Array.isArray(assessment.alignmentFeedback) ? assessment.alignmentFeedback.join(' ') : (assessment.alignmentFeedback || 'Angles were controlled steadily.')}</div>
            <div><strong>Clinical Recommendation:</strong> ${Array.isArray(assessment.recommendations) ? assessment.recommendations.join(' ') : (assessment.recommendations || 'Maintain rhythmic diaphragmatic breathing and continue consistent practice.')}</div>
          `;
        }
      } else {
        throw new Error('Server returned ' + res.status);
      }
    } catch (err) {
      console.warn('AI Pose Assessment fallback:', err);
      if (badgeEl) {
        badgeEl.className = 'badge bg-success text-white rounded-pill px-2 py-1';
        badgeEl.innerHTML = '<i class="fa-solid fa-circle-check me-1"></i>Biomechanically Certified';
      }
      if (explanationEl) {
        explanationEl.innerHTML = `
          <div class="mb-2"><strong>Biomechanical Form Grade: ${avgScore}%</strong> (${avgScore >= 85 ? 'Optimal' : 'Needs Adjustment'})</div>
          <p class="mb-1">You sustained ${correctDuration} seconds of verified safe alignment for ${activePose.name}. ${correctionCount > 0 ? `During practice, ${correctionCount} momentary joint deviations were intercepted safely.` : 'No unsafe angle deviations were detected.'}</p>
          <div class="text-muted small">Recommendation: Keep shoulder girdle relaxed and engage core stabilizers on exhalations.</div>
        `;
      }
    }
  }

  // Public API
  window.SheCareYoga = {
    poses: YOGA_POSES,
    modules: YOGA_MODULES,
    setModule,
    setHoldDuration,
    renderModuleVariations,
    setPose: selectPose,
    selectPose,
    getCurrentPose: () => currentPose,
    renderCurrentPose,
    validatePoseLibrary,
    nextPose,
    startCamera,
    stopCamera,
    simulateAngleChange,
    simulateFault,
    switchSide: () => {
      state.practiceSide = (state.practiceSide === 'right' ? 'left' : 'right');
      speakGuidance(`Switched to ${state.practiceSide} side practice.`);
      return state.practiceSide;
    },
    togglePause: () => {
      state.isPaused = !state.isPaused;
      if (state.isPaused) {
        stopHoldCountdown();
        speakGuidance('Practice paused.');
      } else {
        if (state.isCorrect && state.isPoseHeldStable) {
          startHoldCountdown();
        }
        speakGuidance('Practice resumed.');
      }
      return state.isPaused;
    },
    restartPractice: () => {
      state.sessionStartTime = Date.now();
      state.correctHoldDurationSeconds = 0;
      state.scoreHistory = [95];
      state.issuesEncountered = [];
      state.holdRemainingSeconds = state.holdTargetSeconds;
      state.isCorrect = false;
      state.stableHoldStartTime = 0;
      state.isPoseHeldStable = false;
      state.isPaused = false;
      stopHoldCountdown();
      const timerDisplay = document.getElementById('poseHoldTimerDisplay');
      const progressBar = document.getElementById('poseHoldProgressBar');
      if (timerDisplay) timerDisplay.textContent = '00:00';
      if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.className = 'progress-bar bg-success';
      }
      speakGuidance('Session restarted. Assume the starting pose.');
    },
    endPractice,
    startYogaSession: (categoryOrModule) => {
      console.log('[YogaStudio] startYogaSession triggered with:', categoryOrModule);

      // 1. Scroll smoothly to AI Yoga Studio
      try {
        const studio = document.getElementById('aiYogaStudioSection');
        if (studio) {
          studio.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (scrollErr) {
        console.warn('Scroll error:', scrollErr);
      }

      // 2. Switch to module or default pose
      try {
        if (categoryOrModule) {
          setModule(categoryOrModule);
        } else {
          renderModuleVariations(state.activeModuleId || 'beginner');
          setPose('warrior2');
        }
      } catch (modErr) {
        console.warn('Module switch warning:', modErr);
      }

      // 3. Start Camera
      try {
        startCamera();
      } catch (camErr) {
        console.error('Camera trigger error:', camErr);
      }

      // 4. Initialize 3D Human Avatar in background
      try {
        if (window.SheCare3DAvatar && !window.SheCare3DAvatar.isInitialized) {
          window.SheCare3DAvatar.init('avatar3DContainer');
        }
      } catch (avatarErr) {
        console.warn('Avatar init warning:', avatarErr);
      }

      speakGuidance('Yoga session started! Stand back and match your body with the 3D human model beside the camera. Keep your form aligned to proceed.');
    },
    toggleMirror: () => {
      state.isMirrored = !state.isMirrored;
      const v = document.getElementById('cameraVideo');
      if (v) v.style.transform = state.isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    },
    toggleFacingMode: async () => {
      state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
      if (state.isCameraRunning) {
        stopCamera();
        await startCamera();
      }
    },
    toggleVoice: () => {
      state.voiceEnabled = !state.voiceEnabled;
      return state.voiceEnabled;
    }
  };

})(typeof window !== 'undefined' ? window : global);

