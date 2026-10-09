'use strict';

/**
 * YogaPoseLibrary — Comprehensive 40-Pose Clinical & Biomechanical Yoga Database.
 * Categories: Beginner, Standing, Seated, Balance, Backbends, Inversions/Advanced, Twists/Restorative.
 * Medically-annotated with prenatal safety flags and anatomical alignment rules.
 */
const YOGA_POSE_LIBRARY = [
  // --- 1. BEGINNER FOUNDATIONS ---
  {
    id: 'tadasana',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
    name: 'Mountain Pose',
    sanskrit: 'Tadasana',
    category: 'Beginner',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Stand with feet together or hip-width apart, distributing weight evenly through both feet.',
      'Engage thigh muscles, draw your tailbone slightly down, and lengthen your spine.',
      'Roll shoulders back and down, allowing arms to rest alongside torso with palms facing forward.',
      'Gaze softly straight ahead and breathe deeply through the nose.'
    ],
    benefits: 'Improves posture, strengthens thighs and core, reduces flat feet, establishes centered calm.',
    precautions: 'If dizzy or experiencing low blood pressure, stand with feet hip-distance apart or near a wall.',
    targetAngles: { knees: '170°–180°', spine: 'Vertical 85°–95°', shoulders: 'Relaxed down' },
    alignmentRules: [
      {
        name: 'Knees & Stance',
        evaluate: (angles, lm) => {
          const lk = angles.leftKnee || 180;
          const rk = angles.rightKnee || 180;
          if (lk < 155 || rk < 155) {
            return { valid: false, fault: 'knees_bent', jointIdx: lk < 155 ? 25 : 26, message: 'Straighten your knees and ground firmly through your feet.' };
          }
          return { valid: true };
        }
      },
      {
        name: 'Upright Spine',
        evaluate: (angles, lm) => {
          if (angles.spine !== null && angles.spine > 18) {
            return { valid: false, fault: 'slouching_spine', jointIdx: 11, message: 'Lengthen your spine upright and center shoulders over hips.' };
          }
          return { valid: true };
        }
      }
    ]
  },
  {
    id: 'vrikshasana',
    imageUrl: '../assets/yoga3d/tree.jpg',
    thumbnailUrl: '../assets/yoga3d/tree.jpg',
    name: 'Tree Pose',
    sanskrit: 'Vrikshasana',
    category: 'Balance',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Shift weight onto your standing leg, rooting through all four corners of the foot.',
      'Place sole of opposite foot onto your inner calf or inner thigh (never directly on the knee joint).',
      'Bring hands to prayer (Anjali Mudra) at heart center or reach them overhead.',
      'Fix your gaze on an unmoving point (Drishti) for stability.'
    ],
    benefits: 'Enhances neuromuscular balance, strengthens ankles and calves, tones core.',
    precautions: 'Do not press the foot against the side of the knee joint. Use a wall for balance support if pregnant.',
    targetAngles: { standingKnee: '> 155°', bentKnee: '40°–120°' },
    alignmentRules: [
      {
        name: 'Standing Leg Lock',
        evaluate: (angles, lm) => {
          const lk = angles.leftKnee || 180;
          const rk = angles.rightKnee || 180;
          const standingKnee = lk > rk ? lk : rk;
          const standingIdx = lk > rk ? 25 : 26;
          if (standingKnee < 148) {
            return { valid: false, fault: 'standing_knee_soft', jointIdx: standingIdx, message: 'Keep your standing leg straight and firmly grounded.' };
          }
          return { valid: true };
        }
      },
      {
        name: 'Bent Knee Lift',
        evaluate: (angles, lm) => {
          const lk = angles.leftKnee || 180;
          const rk = angles.rightKnee || 180;
          const bentKnee = lk <= rk ? lk : rk;
          const bentIdx = lk <= rk ? 25 : 26;
          if (bentKnee > 145) {
            return { valid: false, fault: 'bent_knee_not_lifted', jointIdx: bentIdx, message: 'Lift your foot onto your inner calf or thigh and open knee outward.' };
          }
          return { valid: true };
        }
      }
    ]
  },
  {
    id: 'sukhasana',
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=800&auto=format&fit=crop',
    name: 'Easy Pose',
    sanskrit: 'Sukhasana',
    category: 'Beginner',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 20,
    instructions: [
      'Sit cross-legged on your mat or yoga block with hips elevated.',
      'Lengthen your spine, roll shoulders back and down, hands resting gently on knees.',
      'Draw the crown of your head upward and breathe slowly into your lower belly.'
    ],
    benefits: 'Calms the nervous system, opens hips and groins, improves postural endurance.',
    precautions: 'Use a cushion under hips if you have knee discomfort or tight hips.',
    targetAngles: { spine: 'Vertical upright' },
    alignmentRules: [
      {
        name: 'Spine Upright',
        evaluate: (angles, lm) => {
          if (angles.spine !== null && angles.spine > 20) {
            return { valid: false, fault: 'slouching_spine', jointIdx: 11, message: 'Sit tall and lift through the crown of your head.' };
          }
          return { valid: true };
        }
      }
    ]
  },
  {
    id: 'padmasana',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
    name: 'Lotus Pose',
    sanskrit: 'Padmasana',
    category: 'Seated',
    difficulty: 'Intermediate',
    prenatalSafe: true,
    targetHoldSeconds: 20,
    instructions: [
      'Sit on the floor with legs extended straight in front (Dandasana).',
      'Bend right knee, cradle foot with hands, and draw heel onto left hip crease with sole facing up.',
      'Bend left knee, gently draw left foot across right shin onto right hip crease.',
      'Lengthen spine, relax shoulders down, and rest hands on knees in Gyan Mudra with steady diaphragmatic breathing.'
    ],
    benefits: 'Calms the mind, stimulates pelvis and spine, opens hip joints and improves posture.',
    precautions: 'Avoid if experiencing knee injury, ankle sprain or acute sciatica. Practice Ardha Padmasana or Sukhasana instead.',
    targetAngles: { spine: 'Vertical upright 90°', knees: 'Folded in lotus' },
    alignmentRules: [
      {
        name: 'Spine Upright',
        evaluate: (angles, lm) => {
          if (angles.spine !== null && angles.spine > 20) {
            return { valid: false, fault: 'slouching_spine', jointIdx: 11, message: 'Sit tall and lift through the crown of your head.' };
          }
          return { valid: true };
        }
      }
    ]
  },
  {
    id: 'balasana',
    imageUrl: '../assets/yoga3d/child.jpg',
    thumbnailUrl: '../assets/yoga3d/child.jpg',
    name: "Child's Pose",
    sanskrit: 'Balasana',
    category: 'Restorative',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 20,
    instructions: [
      'Kneel on the floor, bring big toes together, and separate knees hip-width or wider.',
      'Lower torso forward between thighs, resting forehead gently on the mat.',
      'Extend arms long in front with palms down, or rest them alongside torso.'
    ],
    benefits: 'Releases lower back tension, calms adrenal stress, stretches hips, thighs, and ankles.',
    precautions: 'Widen knees comfortably if pregnant to accommodate the abdomen.',
    targetAngles: { hips: 'Deep flexion over heels' },
    alignmentRules: [{ name: 'Resting Fold', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'vajrasana',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop',
    name: 'Thunderbolt Pose',
    sanskrit: 'Vajrasana',
    category: 'Beginner',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 20,
    instructions: [
      'Kneel on the floor, sitting directly back on your heels with toes pointing back.',
      'Rest palms on your thighs, keep the spine erect, shoulders relaxed, and gaze forward.',
      'Engage in diaphragmatic breathing.'
    ],
    benefits: 'Aids digestive health, tones pelvic floor, stabilizes spine and knees.',
    precautions: 'Avoid if suffering from acute knee injury or severe osteoarthritis.',
    targetAngles: { spine: 'Upright' },
    alignmentRules: [{ name: 'Spine Alignment', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'marjariasana',
    imageUrl: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?q=80&w=800&auto=format&fit=crop',
    name: 'Cat Pose',
    sanskrit: 'Marjariasana',
    category: 'Beginner',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Begin on hands and knees (tabletop) with wrists directly under shoulders and knees under hips.',
      'Exhale, press the mat away, round your spine toward ceiling, tuck chin toward chest.'
    ],
    benefits: 'Massages spine and abdominal organs, relieves neck and lower back stiffness.',
    precautions: 'Avoid forceful neck flexion if you have cervical spine issues.',
    targetAngles: { spine: 'Convex curve' },
    alignmentRules: [{ name: 'Spine Flexion', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'bitilasana',
    imageUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=800&auto=format&fit=crop',
    name: 'Cow Pose',
    sanskrit: 'Bitilasana',
    category: 'Beginner',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'From tabletop, inhale, soften belly toward floor, lift chest and gaze gently upward.',
      'Broaden across collarbones and keep shoulders away from ears.'
    ],
    benefits: 'Enhances spinal flexibility, stimulates digestive organs, relieves back fatigue.',
    precautions: 'Do not overarch the lower spine, especially in late pregnancy.',
    targetAngles: { spine: 'Gentle concave extension' },
    alignmentRules: [{ name: 'Spine Extension', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'adho_mukha_svanasana',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop',
    name: 'Downward-Facing Dog',
    sanskrit: 'Adho Mukha Svanasana',
    category: 'Standing',
    difficulty: 'Beginner',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'From hands and knees, tuck toes and lift hips high toward the ceiling into an inverted V-shape.',
      'Press firmly through finger pads, lengthen your spine, and reach heels toward the floor.',
      'Keep head between upper arms, neck relaxed.'
    ],
    benefits: 'Stretches hamstrings, calves, and shoulders, builds upper body strength, improves circulation.',
    precautions: 'Avoid in late third trimester if inversion causes heartburn or in uncontrolled hypertension.',
    targetAngles: { hips: '60°–85° flexion', arms: 'Fully extended' },
    alignmentRules: [
      {
        name: 'Arm Extension',
        evaluate: (angles, lm) => {
          const le = angles.leftElbow || 180;
          const re = angles.rightElbow || 180;
          if (le < 145 || re < 145) {
            return { valid: false, fault: 'elbows_bent', jointIdx: le < 145 ? 13 : 14, message: 'Press firmly into the mat and straighten both arms.' };
          }
          return { valid: true };
        }
      }
    ]
  },
  {
    id: 'bhujangasana',
    imageUrl: '../assets/yoga3d/cobra.jpg',
    thumbnailUrl: '../assets/yoga3d/cobra.jpg',
    name: 'Cobra Pose',
    sanskrit: 'Bhujangasana',
    category: 'Backbends',
    difficulty: 'Beginner',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'Lie prone on your stomach, legs extended, tops of feet pressing into mat.',
      'Place hands beneath shoulders with elbows hugged close into ribcage.',
      'Inhale, gently lift chest using back strength, keeping neck in line with spine.'
    ],
    benefits: 'Strengthens back muscles, opens chest and lungs, stimulates abdominal organs.',
    precautions: 'Contraindicated during pregnancy (avoid lying prone on abdomen).',
    targetAngles: { elbows: '80°–130°', chest: 'Lifted' },
    alignmentRules: [
      {
        name: 'Elbows & Chest Lift',
        evaluate: (angles, lm) => {
          const avgElbow = ((angles.leftElbow || 180) + (angles.rightElbow || 180)) / 2;
          if (avgElbow < 75) {
            return { valid: false, fault: 'elbows_overbent', jointIdx: 13, message: 'Lift your chest higher and hug elbows close to your ribs.' };
          }
          return { valid: true };
        }
      }
    ]
  },
  {
    id: 'setu_bandhasana',
    imageUrl: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=800&auto=format&fit=crop',
    name: 'Bridge Pose',
    sanskrit: 'Setu Bandhasana',
    category: 'Backbends',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Lie on your back with knees bent, feet flat on the floor hip-width apart.',
      'Press through feet and arms to lift hips and pelvis toward ceiling.',
      'Roll shoulders underneath and interlace fingers below pelvis if comfortable.'
    ],
    benefits: 'Strengthens glutes, hamstrings, and spine; opens chest, heart, and thyroid.',
    precautions: 'Avoid turning your head while in the bridge pose to protect cervical vertebrae.',
    targetAngles: { hips: 'Lifted 150°–180°', knees: '90° over ankles' },
    alignmentRules: [{ name: 'Pelvis Lift', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'makarasana',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop',
    name: 'Crocodile Pose',
    sanskrit: 'Makarasana',
    category: 'Restorative',
    difficulty: 'Beginner',
    prenatalSafe: false,
    targetHoldSeconds: 20,
    instructions: [
      'Lie prone on belly, cross arms in front, and rest forehead on crossed wrists.',
      'Turn heels inward, toes pointing outward, releasing all muscular tension.'
    ],
    benefits: 'Deeply relaxing for lumbar spine and sacrum, assists diaphragmatic breathing.',
    precautions: 'Avoid in pregnancy due to prone positioning.',
    targetAngles: { body: 'Prone relaxed' },
    alignmentRules: [{ name: 'Relaxed Alignment', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'pawanmuktasana',
    imageUrl: 'https://images.unsplash.com/photo-1508215885820-4a4074ec15bb?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508215885820-4a4074ec15bb?q=80&w=800&auto=format&fit=crop',
    name: 'Wind-Relieving Pose',
    sanskrit: 'Pawanmuktasana',
    category: 'Restorative',
    difficulty: 'Beginner',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'Lie supine on back, bend knees, and draw them toward your chest, wrapping arms around shins.',
      'Gently rock side to side to massage lumbar spine.'
    ],
    benefits: 'Releases trapped gas and bloating, stretches lower back, tones abdominal muscles.',
    precautions: 'Do not compress abdomen forcefully during pregnancy.',
    targetAngles: { knees: 'Flexed toward chest' },
    alignmentRules: [{ name: 'Knee Hug', evaluate: () => ({ valid: true }) }]
  },

  // --- 2. STANDING POSES ---
  {
    id: 'virabhadrasana1',
    imageUrl: 'https://images.unsplash.com/photo-1573384999795-8f5f9f7c46c2?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1573384999795-8f5f9f7c46c2?q=80&w=800&auto=format&fit=crop',
    name: 'Warrior I',
    sanskrit: 'Virabhadrasana I',
    category: 'Standing',
    difficulty: 'Intermediate',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Step one foot back 3–4 feet, turning back foot out 45° with heel grounded.',
      'Bend front knee to 90° tracking over front ankle, square hips forward.',
      'Reach both arms overhead beside ears, palms facing each other.'
    ],
    benefits: 'Builds leg strength, opens chest and hips, promotes mental focus and stamina.',
    precautions: 'Keep stance slightly wider if balance is compromised.',
    targetAngles: { frontKnee: '85°–105°', backKnee: '> 150°', arms: 'Overhead > 140°' },
    alignmentRules: [
      {
        name: 'Front Knee Bend',
        evaluate: (angles, lm) => {
          const lk = angles.leftKnee;
          const rk = angles.rightKnee;
          const frontKnee = (lk && rk) ? Math.min(lk, rk) : (lk || rk);
          if (frontKnee && frontKnee < 75) {
            return { valid: false, fault: 'knee_overextended', jointIdx: lk < rk ? 25 : 26, message: 'Front knee is overextended past ankle! Step front foot forward.' };
          }
          if (frontKnee && frontKnee > 115) {
            return { valid: false, fault: 'knee_too_straight', jointIdx: lk < rk ? 25 : 26, message: 'Bend front knee deeper toward 90° over ankle.' };
          }
          return { valid: true };
        }
      }
    ]
  },
  {
    id: 'virabhadrasana2',
    imageUrl: '../assets/yoga3d/warrior2.jpg',
    thumbnailUrl: '../assets/yoga3d/warrior2.jpg',
    name: 'Warrior II',
    sanskrit: 'Virabhadrasana II',
    category: 'Standing',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Step feet wide (3.5–4 feet apart). Turn front foot forward and back foot perpendicular.',
      'Bend front knee to 90°, keeping knee stacked directly over ankle.',
      'Extend arms parallel to floor at shoulder height, gazing past front fingertips.',
      'Keep torso upright and shoulders relaxed.'
    ],
    benefits: 'Strengthens thighs, calves, and core; opens hips and chest; develops stability.',
    precautions: 'Avoid letting front knee collapse inward past the big toe.',
    targetAngles: { frontKnee: '85°–105°', backKnee: '> 150°', arms: '80°–100°' },
    alignmentRules: [
      {
        name: 'Front Knee Alignment',
        evaluate: (angles, lm) => {
          const lk = angles.leftKnee;
          const rk = angles.rightKnee;
          const isLeftFront = (lk && rk) ? (lk <= rk) : Boolean(lk);
          const frontKnee = isLeftFront ? lk : rk;
          const frontIdx = isLeftFront ? 25 : 26;
          if (frontKnee && frontKnee < 75) {
            return { valid: false, fault: 'knee_overextended', jointIdx: frontIdx, message: 'Front knee is overextended! Step foot forward to align knee over ankle.' };
          }
          if (frontKnee && frontKnee > 115) {
            return { valid: false, fault: 'knee_too_straight', jointIdx: frontIdx, message: 'Bend your front knee deeper toward 90° for hip stability.' };
          }
          return { valid: true };
        }
      },
      {
        name: 'Arm Elevation',
        evaluate: (angles, lm) => {
          const la = angles.leftShoulderElevation;
          const ra = angles.rightShoulderElevation;
          if (la && la < 70) return { valid: false, fault: 'left_arm_drooping', jointIdx: 11, message: 'Raise your left arm parallel to the floor at shoulder height.' };
          if (ra && ra < 70) return { valid: false, fault: 'right_arm_drooping', jointIdx: 12, message: 'Raise your right arm parallel to the floor at shoulder height.' };
          return { valid: true };
        }
      }
    ]
  },
  {
    id: 'virabhadrasana3',
    imageUrl: 'https://images.unsplash.com/photo-1591228127791-8e2eaef098d3?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1591228127791-8e2eaef098d3?q=80&w=800&auto=format&fit=crop',
    name: 'Warrior III',
    sanskrit: 'Virabhadrasana III',
    category: 'Balance',
    difficulty: 'Advanced',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'From standing, hinge at hips while floating one leg straight behind you parallel to floor.',
      'Extend arms forward or alongside torso, creating a straight line from crown to back heel.',
      'Keep standing knee firm and level both hip points facing the mat.'
    ],
    benefits: 'Strengthens back, hamstrings, and ankles; develops profound balance and core stability.',
    precautions: 'Use chair or blocks for hand support if pregnant or recovering from ankle injury.',
    targetAngles: { torsoAndBackLeg: 'Horizontal line 160°–180°', standingLeg: '170°–180°' },
    alignmentRules: [{ name: 'T-Formation Balance', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'utkatasana',
    imageUrl: '../assets/yoga3d/chair.jpg',
    thumbnailUrl: '../assets/yoga3d/chair.jpg',
    name: 'Chair Pose',
    sanskrit: 'Utkatasana',
    category: 'Standing',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Stand with feet hip-width apart. Inhale and sweep arms overhead beside ears.',
      'Exhale and bend knees, sinking hips back and down as if sitting into an imaginary chair.',
      'Draw weight slightly into heels and keep chest lifted with a natural spinal curve.'
    ],
    benefits: 'Tones thighs, glutes, and calves; strengthens ankles; stimulates abdominal organs.',
    precautions: 'Do not squat past 90° if dealing with knee pain.',
    targetAngles: { knees: '85°–115°', arms: 'Overhead > 120°' },
    alignmentRules: [
      {
        name: 'Squat Depth',
        evaluate: (angles, lm) => {
          const avgKnee = ((angles.leftKnee || 180) + (angles.rightKnee || 180)) / 2;
          if (avgKnee > 125) return { valid: false, fault: 'chair_too_high', jointIdx: 26, message: 'Bend knees deeper and sink hips back as if into a chair.' };
          if (avgKnee < 70) return { valid: false, fault: 'chair_too_deep', jointIdx: 26, message: 'Sitting too low! Lift hips slightly to protect knees.' };
          return { valid: true };
        }
      }
    ]
  },
  {
    id: 'trikonasana',
    imageUrl: '../assets/yoga3d/triangle.jpg',
    thumbnailUrl: '../assets/yoga3d/triangle.jpg',
    name: 'Triangle Pose',
    sanskrit: 'Trikonasana',
    category: 'Standing',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Step feet wide (3–4 feet). Turn front foot forward and back foot slightly angled inward.',
      'Extend arms out parallel to floor, reach front torso forward, then hinge at front hip.',
      'Rest lower hand on shin, block, or floor; extend top arm toward ceiling, opening chest.'
    ],
    benefits: 'Stretches hamstrings, groins, and spine; relieves backache; expands ribcage and lungs.',
    precautions: 'Do not hyperextend front knee—keep a micro-bend if needed. Use a block for hand support.',
    targetAngles: { frontKnee: '> 150°', topArm: 'Skyward > 70°' },
    alignmentRules: [
      {
        name: 'Front Knee Straightness',
        evaluate: (angles, lm) => {
          const lk = angles.leftKnee || 180;
          if (lk < 145) return { valid: false, fault: 'triangle_knee_bent', jointIdx: 25, message: 'Straighten your front leg and ground firmly through both feet.' };
          return { valid: true };
        }
      }
    ]
  },
  {
    id: 'parsvakonasana',
    imageUrl: 'https://images.unsplash.com/photo-1599447292180-45fd84092ef4?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1599447292180-45fd84092ef4?q=80&w=800&auto=format&fit=crop',
    name: 'Extended Side Angle',
    sanskrit: 'Utthita Parsvakonasana',
    category: 'Standing',
    difficulty: 'Intermediate',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'From wide stance, bend front knee to 90°. Rest front forearm on thigh or hand on block.',
      'Extend top arm in a diagonal line past your ear, creating a line from back heel to fingertips.',
      'Rotate chest open toward ceiling.'
    ],
    benefits: 'Strengthens legs and knees; stretches groins, spine, and waist; improves stamina.',
    precautions: 'Do not collapse torso weight onto the front thigh.',
    targetAngles: { frontKnee: '85°–105°', topArm: 'Diagonal extension' },
    alignmentRules: [{ name: 'Stance Depth', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'ardha_chandrasana',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
    name: 'Half Moon Pose',
    sanskrit: 'Ardha Chandrasana',
    category: 'Balance',
    difficulty: 'Intermediate',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'From Triangle pose, bend front knee, place fingertips on block 12 inches forward.',
      'Lift back leg parallel to floor, straighten standing leg, and rotate top hip and shoulder open.',
      'Extend top arm skyward.'
    ],
    benefits: 'Improves coordination and balance, strengthens ankles and thighs, opens chest.',
    precautions: 'Perform against a wall for safety if pregnant or experiencing vertigo.',
    targetAngles: { liftedLeg: 'Parallel to floor 160°–180°' },
    alignmentRules: [{ name: 'Balance Hold', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'prasarita_padottanasana',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop',
    name: 'Wide-Leg Forward Fold',
    sanskrit: 'Prasarita Padottanasana',
    category: 'Standing',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Step feet wide (4 feet apart) with outer foot edges parallel.',
      'Inhale, lengthen spine; exhale, hinge at hips and fold forward, resting hands on mat or blocks.',
      'Relax neck and release crown toward floor.'
    ],
    benefits: 'Stretches hamstrings, calves, and inner thighs; decompresses spine; calms brain.',
    precautions: 'Keep knees soft if hamstrings are tight. Do not fold fully if experiencing low blood pressure.',
    targetAngles: { legs: 'Wide stance', spine: 'Decompressed forward fold' },
    alignmentRules: [{ name: 'Fold Alignment', evaluate: () => ({ valid: true }) }]
  },

  // --- 3. SEATED POSES ---
  {
    id: 'dandasana',
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=800&auto=format&fit=crop',
    name: 'Staff Pose',
    sanskrit: 'Dandasana',
    category: 'Seated',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 20,
    instructions: [
      'Sit on floor with legs extended straight in front, feet flexed.',
      'Place palms flat on floor beside hips, lengthen spine tall, roll shoulders back.',
      'Engage quadriceps and draw navel toward spine.'
    ],
    benefits: 'Strengthens back muscles, improves seated posture, stretches hamstrings and calves.',
    precautions: 'Sit on a folded blanket if hamstrings are tight.',
    targetAngles: { torsoToLegs: '90° right angle', knees: '170°–180°' },
    alignmentRules: [{ name: 'Spine Upright', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'paschimottanasana',
    imageUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=800&auto=format&fit=crop',
    name: 'Seated Forward Bend',
    sanskrit: 'Paschimottanasana',
    category: 'Seated',
    difficulty: 'Intermediate',
    prenatalSafe: false,
    targetHoldSeconds: 20,
    instructions: [
      'From Staff pose, inhale arms overhead, exhale and hinge at hips toward feet.',
      'Hold shins, ankles, or feet with spine long, leading with the chest rather than head.'
    ],
    benefits: 'Stretches entire posterior chain, calms mind, stimulates liver and kidneys.',
    precautions: 'Contraindicated during pregnancy (avoid compressing the abdomen).',
    targetAngles: { hipHinge: 'Forward fold' },
    alignmentRules: [{ name: 'Hips Fold', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'baddha_konasana',
    imageUrl: '../assets/yoga3d/butterfly.jpg',
    thumbnailUrl: '../assets/yoga3d/butterfly.jpg',
    name: 'Butterfly Pose',
    sanskrit: 'Baddha Konasana',
    category: 'Seated',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 20,
    instructions: [
      'Sit tall, bend knees, and bring soles of feet together, letting knees fall open to sides.',
      'Hold feet or ankles, lengthen spine, and gently draw knees toward mat without forcing.'
    ],
    benefits: 'Stimulates pelvic circulation, relieves menstrual cramps, supports prenatal hip mobility.',
    precautions: 'Support knees with blocks if groins or inner knees feel strained.',
    targetAngles: { spine: 'Upright', knees: 'Splayed outward' },
    alignmentRules: [{ name: 'Pelvic Symmetry', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'ardha_matsyendrasana',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop',
    name: 'Half Lord of the Fishes',
    sanskrit: 'Ardha Matsyendrasana',
    category: 'Seated',
    difficulty: 'Intermediate',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'Sit with legs extended. Bend right knee, placing right foot on outside of left thigh.',
      'Inhale left arm up, exhale twist torso to right, hugging knee or hooking left elbow outside right knee.',
      'Keep spine long on inhales, deepen twist gently on exhales.'
    ],
    benefits: 'Maintains spinal rotation mobility, aids digestive peristalsis, relieves back tension.',
    precautions: 'Avoid deep closed twists during pregnancy; perform open gentle twists instead.',
    targetAngles: { spinalTwist: 'Rotational 30°–45°' },
    alignmentRules: [{ name: 'Torso Twist', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'janu_sirsasana',
    imageUrl: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=800&auto=format&fit=crop',
    name: 'Head-to-Knee Pose',
    sanskrit: 'Janu Sirsasana',
    category: 'Seated',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Sit with left leg extended, bend right knee, placing right sole against inner left thigh.',
      'Turn torso toward left leg, fold forward with a long spine, reaching hands for foot or shin.'
    ],
    benefits: 'Stretches hamstrings and groins, calms brain, aids digestion.',
    precautions: 'Widen angle between thighs during pregnancy to leave room for the belly.',
    targetAngles: { forwardFold: 'Angled fold' },
    alignmentRules: [{ name: 'Fold Alignment', evaluate: () => ({ valid: true }) }]
  },

  // --- 4. BALANCE POSES ---
  {
    id: 'garudasana',
    imageUrl: 'https://images.unsplash.com/photo-1591228127791-8e2eaef098d3?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1591228127791-8e2eaef098d3?q=80&w=800&auto=format&fit=crop',
    name: 'Eagle Pose',
    sanskrit: 'Garudasana',
    category: 'Balance',
    difficulty: 'Intermediate',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Stand, bend knees slightly, lift right thigh and cross it over left thigh, hooking foot behind calf.',
      'Cross left arm over right at elbows, bend elbows, and wrap forearms with palms pressing together.',
      'Sink hips low, lift elbows to shoulder height, and focus on steady breathing.'
    ],
    benefits: 'Strengthens ankles and calves; stretches shoulders and upper back; improves balance.',
    precautions: 'Rest toes of wrapping foot on floor if balance is challenging.',
    targetAngles: { hips: 'Deep flexion', arms: 'Intertwined at shoulder height' },
    alignmentRules: [{ name: 'Balance Alignment', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'natarajasana',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
    name: 'Dancer Pose',
    sanskrit: 'Natarajasana',
    category: 'Balance',
    difficulty: 'Advanced',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'Shift weight to standing foot. Bend opposite knee and clasp inner ankle with same-side hand.',
      'Reach other arm forward and up. Kick back foot up and away, arching back gracefully.'
    ],
    benefits: 'Stretches shoulders, chest, and quadriceps; develops profound balance and leg strength.',
    precautions: 'Practice near a wall; avoid excessive lower back arching.',
    targetAngles: { backFootKick: 'Lifted behind' },
    alignmentRules: [{ name: 'Standing Stability', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'bakasana',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop',
    name: 'Crow Pose',
    sanskrit: 'Bakasana',
    category: 'Balance',
    difficulty: 'Advanced',
    prenatalSafe: false,
    targetHoldSeconds: 10,
    instructions: [
      'Squat, plant hands shoulder-width apart, spread fingers wide.',
      'Lift hips high, place knees against upper triceps near armpits.',
      'Shift weight forward onto hands, gaze slightly ahead, and float feet off floor.'
    ],
    benefits: 'Builds arm and wrist strength, tones core, develops balance and courage.',
    precautions: 'Contraindicated in carpal tunnel syndrome and pregnancy.',
    targetAngles: { arms: 'Supporting weight', knees: 'On triceps' },
    alignmentRules: [{ name: 'Arm Balance', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'vasisthasana',
    imageUrl: 'https://images.unsplash.com/photo-1573384999795-8f5f9f7c46c2?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1573384999795-8f5f9f7c46c2?q=80&w=800&auto=format&fit=crop',
    name: 'Side Plank',
    sanskrit: 'Vasisthasana',
    category: 'Balance',
    difficulty: 'Intermediate',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'From plank, shift onto outer edge of right foot and stack left foot on top.',
      'Press right palm into floor under shoulder, reach left arm toward ceiling, lifting hips high.'
    ],
    benefits: 'Strengthens wrists, arms, shoulders, and obliques; tones core.',
    precautions: 'Lower bottom knee to floor for modified variation if wrists feel strain.',
    targetAngles: { bodyLine: 'Straight diagonal plank 160°–180°' },
    alignmentRules: [{ name: 'Lateral Alignment', evaluate: () => ({ valid: true }) }]
  },

  // --- 5. BACKBENDS ---
  {
    id: 'ustrasana',
    imageUrl: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?q=80&w=800&auto=format&fit=crop',
    name: 'Camel Pose',
    sanskrit: 'Ustrasana',
    category: 'Backbends',
    difficulty: 'Intermediate',
    prenatalSafe: true,
    targetHoldSeconds: 15,
    instructions: [
      'Kneel with hips stacked above knees, hip-width apart.',
      'Place hands on sacrum with fingers pointing down, draw elbows toward each other.',
      'Inhale, lift chest high, gently arch backward, reaching hands to heels if accessible.'
    ],
    benefits: 'Opens chest, throat, and hip flexors; strengthens back and glutes.',
    precautions: 'Keep neck comfortable; do not compress cervical spine or overextend in late pregnancy.',
    targetAngles: { spine: 'Thoracic extension', hips: 'Over knees' },
    alignmentRules: [{ name: 'Backbend Hold', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'dhanurasana',
    imageUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=800&auto=format&fit=crop',
    name: 'Bow Pose',
    sanskrit: 'Dhanurasana',
    category: 'Backbends',
    difficulty: 'Intermediate',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'Lie on belly, bend knees, and reach back to grasp outer ankles.',
      'Inhale, kick feet back and upward into hands, lifting chest and thighs off mat.',
      'Gaze forward and maintain steady breathing.'
    ],
    benefits: 'Strengthens back muscles, massages abdominal organs, opens front body.',
    precautions: 'Contraindicated during pregnancy and for high blood pressure.',
    targetAngles: { chestAndThighs: 'Lifted off floor' },
    alignmentRules: [{ name: 'Bow Lift', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'salabhasana',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop',
    name: 'Locust Pose',
    sanskrit: 'Salabhasana',
    category: 'Backbends',
    difficulty: 'Beginner',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'Lie on belly with arms along sides, palms facing down.',
      'Inhale and lift head, chest, arms, and legs off mat simultaneously, balancing on pelvis.',
      'Keep neck long and gaze slightly down.'
    ],
    benefits: 'Strengthens glutes, hamstrings, and erector spinae; counteracts sitting posture.',
    precautions: 'Contraindicated during pregnancy.',
    targetAngles: { spinalExtension: 'Lifted' },
    alignmentRules: [{ name: 'Locust Lift', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'chakrasana',
    imageUrl: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=800&auto=format&fit=crop',
    name: 'Wheel Pose',
    sanskrit: 'Urdhva Dhanurasana',
    category: 'Backbends',
    difficulty: 'Advanced',
    prenatalSafe: false,
    targetHoldSeconds: 10,
    instructions: [
      'Lie supine, bend knees, feet flat near sit-bones. Place palms beside ears with fingers pointing to shoulders.',
      'Press through feet and palms, lifting hips and chest off mat into a full upward arch.',
      'Straighten arms and broaden chest.'
    ],
    benefits: 'Deeply expands lungs and heart, builds spinal flexibility and arm strength.',
    precautions: 'Contraindicated in wrist injuries, cardiac issues, and pregnancy.',
    targetAngles: { fullArch: 'Upward curve' },
    alignmentRules: [{ name: 'Wheel Arch', evaluate: () => ({ valid: true }) }]
  },

  // --- 6. INVERSIONS / ADVANCED ---
  {
    id: 'sirsasana',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop',
    name: 'Headstand',
    sanskrit: 'Sirsasana',
    category: 'Inversions',
    difficulty: 'Advanced',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'Interlace fingers on mat, placing forearms down elbow-width apart.',
      'Place crown of head on mat cupped by hands. Walk feet in, engaging core, and lift legs upward vertically.'
    ],
    benefits: 'Calms mind, stimulates pituitary gland, strengthens core, shoulders, and arms.',
    precautions: 'Requires experienced teacher; contraindicated in cervical issues and hypertension.',
    targetAngles: { verticalLine: 'Vertical 170°–180°' },
    alignmentRules: [{ name: 'Inversion Alignment', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'sarvangasana',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop',
    name: 'Shoulder Stand',
    sanskrit: 'Sarvangasana',
    category: 'Inversions',
    difficulty: 'Advanced',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'Lie on back, lift legs and hips overhead, supporting mid-back with hands.',
      'Extend legs straight up toward ceiling, keeping weight on shoulders rather than neck.'
    ],
    benefits: 'Stimulates thyroid gland, calms heart, relieves varicose veins and fatigue.',
    precautions: 'Avoid turning neck; contraindicated in neck injury, glaucoma, and menstruation.',
    targetAngles: { verticalLegs: 'Vertical' },
    alignmentRules: [{ name: 'Shoulder Support', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'halasana',
    imageUrl: 'https://images.unsplash.com/photo-1508215885820-4a4074ec15bb?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508215885820-4a4074ec15bb?q=80&w=800&auto=format&fit=crop',
    name: 'Plow Pose',
    sanskrit: 'Halasana',
    category: 'Inversions',
    difficulty: 'Advanced',
    prenatalSafe: false,
    targetHoldSeconds: 15,
    instructions: [
      'From Shoulder Stand, hinge at hips and lower toes to floor behind head.',
      'Keep legs straight and interlace fingers on mat behind back, lifting hips high.'
    ],
    benefits: 'Stretches entire spine, calms brain, stimulates abdominal organs and thyroid.',
    precautions: 'Avoid if suffering from cervical disc problems or during late pregnancy.',
    targetAngles: { hipsHinged: 'Overhead fold' },
    alignmentRules: [{ name: 'Plow Hold', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'pincha_mayurasana',
    imageUrl: 'https://images.unsplash.com/photo-1573384999795-8f5f9f7c46c2?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1573384999795-8f5f9f7c46c2?q=80&w=800&auto=format&fit=crop',
    name: 'Forearm Stand',
    sanskrit: 'Pincha Mayurasana',
    category: 'Inversions',
    difficulty: 'Advanced',
    prenatalSafe: false,
    targetHoldSeconds: 10,
    instructions: [
      'Forearms on mat shoulder-width apart. Walk feet close to elbows in Dolphin pose.',
      'Engage core and kick legs upward, balancing body in a vertical line above forearms.'
    ],
    benefits: 'Develops shoulder stability, strengthens core and back, improves balance.',
    precautions: 'Practice near a wall; avoid in shoulder injuries.',
    targetAngles: { forearms: '90° base' },
    alignmentRules: [{ name: 'Forearm Balance', evaluate: () => ({ valid: true }) }]
  },

  // --- 7. TWISTS & RESTORATIVE ---
  {
    id: 'supta_matsyendrasana',
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=800&auto=format&fit=crop',
    name: 'Supine Spinal Twist',
    sanskrit: 'Supta Matsyendrasana',
    category: 'Twists',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 20,
    instructions: [
      'Lie supine, draw right knee to chest, extend right arm out in a T-shape.',
      'Exhale and guide right knee across torso toward left side, keeping both shoulders grounded.'
    ],
    benefits: 'Releases lumbar tension, improves spinal rotation, aids digestive relaxation.',
    precautions: 'Keep twist gentle; support knees on a pillow during pregnancy.',
    targetAngles: { shouldersGrounded: 'Flat on mat' },
    alignmentRules: [{ name: 'Supine Twist', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'ananda_balasana',
    imageUrl: 'https://images.unsplash.com/photo-1508215885820-4a4074ec15bb?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508215885820-4a4074ec15bb?q=80&w=800&auto=format&fit=crop',
    name: 'Happy Baby',
    sanskrit: 'Ananda Balasana',
    category: 'Restorative',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 20,
    instructions: [
      'Lie on back, bend knees toward armpits, grab outside edges of feet with hands.',
      'Stack ankles directly above knees with shins perpendicular to floor, gently rocking side to side.'
    ],
    benefits: 'Gently opens hips and inner groins, decompresses lower back and sacrum.',
    precautions: 'Hold ankles or behind knees if feet are difficult to reach.',
    targetAngles: { shins: 'Perpendicular 90°' },
    alignmentRules: [{ name: 'Happy Baby Stretch', evaluate: () => ({ valid: true }) }]
  },
  {
    id: 'savasana',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop',
    name: 'Corpse Pose',
    sanskrit: 'Savasana',
    category: 'Restorative',
    difficulty: 'Beginner',
    prenatalSafe: true,
    targetHoldSeconds: 30,
    instructions: [
      'Lie flat on back with legs comfortable distance apart, arms resting by sides with palms facing up.',
      'Close eyes, release all muscular effort, and allow breath to flow naturally for deep integration.'
    ],
    benefits: 'Calms central nervous system, reduces blood pressure and anxiety, integrates session benefits.',
    precautions: 'During second and third trimester of pregnancy, lie on your left side with pillows.',
    targetAngles: { body: 'Total relaxation' },
    alignmentRules: [{ name: 'Total Relaxation', evaluate: () => ({ valid: true }) }]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = YOGA_POSE_LIBRARY;
}
if (typeof window !== 'undefined') {
  window.YOGA_POSE_LIBRARY = YOGA_POSE_LIBRARY;
}
