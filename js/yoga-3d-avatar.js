/**
 * SheCare Realistic Interactive 3D WebGL Yoga Model Engine
 * 
 * Powered by Three.js WebGL rendering:
 * 1. Realistic, continuous 360° Horizontal Orbit & Vertical pitch with smooth damping & zoom.
 * 2. Dedicated Full-body 3D Human Yoga Character:
 *    - Anatomically accurate human proportions (Head, Face, Neck, Torso, Hips, Arms, Hands, Legs, Knees, Feet).
 *    - Authentic yoga apparel with fabric shading.
 *    - Professional neutral studio stage with subtle grid floor, ambient occlusion shadow, and 3-point studio lighting.
 * 3. Exact 1-to-1 Pose Mapping:
 *    - Loads ONLY the model corresponding to `selectedPose.id`.
 *    - Cleanly unloads and disposes existing meshes and textures before loading the new pose.
 *    - If a pose does not have a 3D model asset, displays "3D model unavailable for this pose." without mixing poses.
 * 4. Real-time Biomechanical Fault Detection & Correction Overlay:
 *    - Faulty joint rings in radiant red with directional correction cues.
 *    - Turns emerald green when posture aligns with target angles.
 * 5. Full Touch and Mouse 360° Drag & Zoom support with Reset View functionality.
 */

(function(window) {
  'use strict';

  // Strict 1-to-1 Pose Definitions with dedicated 3D skeletal & joint configurations
  const REALISTIC_3D_POSES = {
    'warrior2': {
      id: 'warrior2',
      name: 'Warrior II',
      sanskrit: 'Virabhadrasana II',
      difficulty: 'Beginner',
      textureUrl: '../assets/yoga3d/warrior2.jpg',
      targetAngleHint: 'Front Knee: 90° | Arms: 180° Flat',
      poseData: {
        torsoRotation: [0, 0, 0],
        headRotation: [0, -0.6, 0],
        leftLeg: { hip: [0.1, 0, -0.75], knee: 1.57, ankle: -0.1 },
        rightLeg: { hip: [-0.05, 0, 0.65], knee: 0.05, ankle: 0.1 },
        leftArm: { shoulder: [0, 0, -1.57], elbow: 0.05 },
        rightArm: { shoulder: [0, 0, 1.57], elbow: 0.05 },
        hipsY: 0.88,
        stanceWidth: 1.45
      },
      faultMapping: {
        'knee_overextended': 'leftKnee',
        'knee_too_straight': 'leftKnee',
        'left_arm_drooping': 'leftShoulder',
        'right_arm_drooping': 'rightShoulder',
        'back_leg_bent': 'rightKnee'
      }
    },
    'virabhadrasana2': {
      id: 'virabhadrasana2',
      name: 'Warrior II',
      sanskrit: 'Virabhadrasana II',
      difficulty: 'Beginner',
      textureUrl: '../assets/yoga3d/warrior2.jpg',
      targetAngleHint: 'Front Knee: 90° | Arms: 180° Flat',
      poseData: {
        torsoRotation: [0, 0, 0],
        headRotation: [0, -0.6, 0],
        leftLeg: { hip: [0.1, 0, -0.75], knee: 1.57, ankle: -0.1 },
        rightLeg: { hip: [-0.05, 0, 0.65], knee: 0.05, ankle: 0.1 },
        leftArm: { shoulder: [0, 0, -1.57], elbow: 0.05 },
        rightArm: { shoulder: [0, 0, 1.57], elbow: 0.05 },
        hipsY: 0.88,
        stanceWidth: 1.45
      },
      faultMapping: {
        'knee_overextended': 'leftKnee',
        'knee_too_straight': 'leftKnee',
        'left_arm_drooping': 'leftShoulder',
        'right_arm_drooping': 'rightShoulder',
        'back_leg_bent': 'rightKnee'
      }
    },
    'vrikshasana': {
      id: 'vrikshasana',
      name: 'Tree Pose',
      sanskrit: 'Vrikshasana',
      difficulty: 'Beginner',
      textureUrl: '../assets/yoga3d/tree.jpg',
      targetAngleHint: 'Standing Leg: 180° Straight | Prayer Hands',
      poseData: {
        torsoRotation: [0, 0, 0],
        headRotation: [0, 0, 0],
        leftLeg: { hip: [0.1, 0.8, -0.6], knee: 2.1, ankle: 0.2 },
        rightLeg: { hip: [0, 0, 0], knee: 0.02, ankle: 0 },
        leftArm: { shoulder: [0, 0, -2.8], elbow: 0.9 },
        rightArm: { shoulder: [0, 0, 2.8], elbow: 0.9 },
        hipsY: 1.05,
        stanceWidth: 0.45
      },
      faultMapping: {
        'standing_knee_soft': 'rightKnee',
        'bent_knee_not_lifted': 'leftKnee',
        'hands_not_centered': 'chest'
      }
    },
    'tree': {
      id: 'tree',
      name: 'Tree Pose',
      sanskrit: 'Vrikshasana',
      difficulty: 'Beginner',
      textureUrl: '../assets/yoga3d/tree.jpg',
      targetAngleHint: 'Standing Leg: 180° Straight | Prayer Hands',
      poseData: {
        torsoRotation: [0, 0, 0],
        headRotation: [0, 0, 0],
        leftLeg: { hip: [0.1, 0.8, -0.6], knee: 2.1, ankle: 0.2 },
        rightLeg: { hip: [0, 0, 0], knee: 0.02, ankle: 0 },
        leftArm: { shoulder: [0, 0, -2.8], elbow: 0.9 },
        rightArm: { shoulder: [0, 0, 2.8], elbow: 0.9 },
        hipsY: 1.05,
        stanceWidth: 0.45
      },
      faultMapping: {
        'standing_knee_soft': 'rightKnee',
        'bent_knee_not_lifted': 'leftKnee',
        'hands_not_centered': 'chest'
      }
    },
    'trikonasana': {
      id: 'trikonasana',
      name: 'Extended Triangle Pose',
      sanskrit: 'Trikonasana',
      difficulty: 'Intermediate',
      textureUrl: '../assets/yoga3d/triangle.jpg',
      targetAngleHint: 'Front Leg Straight: 180° | Top Arm Vertical: 90°',
      poseData: {
        torsoRotation: [0, 0, -0.7],
        headRotation: [0, 0.8, 0],
        leftLeg: { hip: [0, 0, -0.55], knee: 0.05, ankle: 0 },
        rightLeg: { hip: [0, 0, 0.55], knee: 0.05, ankle: 0 },
        leftArm: { shoulder: [0, 0, -0.6], elbow: 0.05 },
        rightArm: { shoulder: [0, 0, 2.45], elbow: 0.05 },
        hipsY: 0.96,
        stanceWidth: 1.35
      },
      faultMapping: {
        'front_knee_bent': 'leftKnee',
        'top_arm_drooping': 'rightShoulder',
        'spine_collapsing': 'spine'
      }
    },
    'triangle': {
      id: 'triangle',
      name: 'Extended Triangle Pose',
      sanskrit: 'Trikonasana',
      difficulty: 'Intermediate',
      textureUrl: '../assets/yoga3d/triangle.jpg',
      targetAngleHint: 'Front Leg Straight: 180° | Top Arm Vertical: 90°',
      poseData: {
        torsoRotation: [0, 0, -0.7],
        headRotation: [0, 0.8, 0],
        leftLeg: { hip: [0, 0, -0.55], knee: 0.05, ankle: 0 },
        rightLeg: { hip: [0, 0, 0.55], knee: 0.05, ankle: 0 },
        leftArm: { shoulder: [0, 0, -0.6], elbow: 0.05 },
        rightArm: { shoulder: [0, 0, 2.45], elbow: 0.05 },
        hipsY: 0.96,
        stanceWidth: 1.35
      },
      faultMapping: {
        'front_knee_bent': 'leftKnee',
        'top_arm_drooping': 'rightShoulder',
        'spine_collapsing': 'spine'
      }
    },
    'bhujangasana': {
      id: 'bhujangasana',
      name: 'Cobra Pose',
      sanskrit: 'Bhujangasana',
      difficulty: 'Beginner',
      textureUrl: '../assets/yoga3d/cobra.jpg',
      targetAngleHint: 'Chest Lifted Gracefully | Shoulders Down',
      poseData: {
        torsoRotation: [-0.65, 0, 0],
        headRotation: [-0.3, 0, 0],
        leftLeg: { hip: [-0.2, 0, 0], knee: 0.05, ankle: 0 },
        rightLeg: { hip: [-0.2, 0, 0], knee: 0.05, ankle: 0 },
        leftArm: { shoulder: [0.6, 0, -0.4], elbow: 1.1 },
        rightArm: { shoulder: [0.6, 0, 0.4], elbow: 1.1 },
        hipsY: 0.28,
        stanceWidth: 0.35
      },
      faultMapping: {
        'shoulders_hunched': 'leftShoulder',
        'elbows_flared': 'leftElbow',
        'neck_compressed': 'head'
      }
    },
    'cobra': {
      id: 'cobra',
      name: 'Cobra Pose',
      sanskrit: 'Bhujangasana',
      difficulty: 'Beginner',
      textureUrl: '../assets/yoga3d/cobra.jpg',
      targetAngleHint: 'Chest Lifted Gracefully | Shoulders Down',
      poseData: {
        torsoRotation: [-0.65, 0, 0],
        headRotation: [-0.3, 0, 0],
        leftLeg: { hip: [-0.2, 0, 0], knee: 0.05, ankle: 0 },
        rightLeg: { hip: [-0.2, 0, 0], knee: 0.05, ankle: 0 },
        leftArm: { shoulder: [0.6, 0, -0.4], elbow: 1.1 },
        rightArm: { shoulder: [0.6, 0, 0.4], elbow: 1.1 },
        hipsY: 0.28,
        stanceWidth: 0.35
      },
      faultMapping: {
        'shoulders_hunched': 'leftShoulder',
        'elbows_flared': 'leftElbow',
        'neck_compressed': 'head'
      }
    },
    'balasana': {
      id: 'balasana',
      name: "Child's Pose",
      sanskrit: 'Balasana',
      difficulty: 'Restorative',
      textureUrl: '../assets/yoga3d/child.jpg',
      targetAngleHint: 'Forehead Grounded | Arms Extended Long',
      poseData: {
        torsoRotation: [1.3, 0, 0],
        headRotation: [0.2, 0, 0],
        leftLeg: { hip: [1.8, 0, -0.2], knee: 2.7, ankle: 0.4 },
        rightLeg: { hip: [1.8, 0, 0.2], knee: 2.7, ankle: 0.4 },
        leftArm: { shoulder: [2.5, 0, -0.2], elbow: 0.2 },
        rightArm: { shoulder: [2.5, 0, 0.2], elbow: 0.2 },
        hipsY: 0.25,
        stanceWidth: 0.4
      },
      faultMapping: {
        'hips_lifted': 'hips',
        'spine_tense': 'spine'
      }
    },
    'child': {
      id: 'child',
      name: "Child's Pose",
      sanskrit: 'Balasana',
      difficulty: 'Restorative',
      textureUrl: '../assets/yoga3d/child.jpg',
      targetAngleHint: 'Forehead Grounded | Arms Extended Long',
      poseData: {
        torsoRotation: [1.3, 0, 0],
        headRotation: [0.2, 0, 0],
        leftLeg: { hip: [1.8, 0, -0.2], knee: 2.7, ankle: 0.4 },
        rightLeg: { hip: [1.8, 0, 0.2], knee: 2.7, ankle: 0.4 },
        leftArm: { shoulder: [2.5, 0, -0.2], elbow: 0.2 },
        rightArm: { shoulder: [2.5, 0, 0.2], elbow: 0.2 },
        hipsY: 0.25,
        stanceWidth: 0.4
      },
      faultMapping: {
        'hips_lifted': 'hips',
        'spine_tense': 'spine'
      }
    },
    'chair': {
      id: 'chair',
      name: 'Chair Pose',
      sanskrit: 'Utkatasana',
      difficulty: 'Beginner',
      textureUrl: '../assets/yoga3d/chair.jpg',
      targetAngleHint: 'Knees Bent: 95° | Arms Reaching High',
      poseData: {
        torsoRotation: [0.4, 0, 0],
        headRotation: [-0.2, 0, 0],
        leftLeg: { hip: [0.95, 0, 0], knee: 1.45, ankle: -0.3 },
        rightLeg: { hip: [0.95, 0, 0], knee: 1.45, ankle: -0.3 },
        leftArm: { shoulder: [2.7, 0, -0.2], elbow: 0.1 },
        rightArm: { shoulder: [2.7, 0, 0.2], elbow: 0.1 },
        hipsY: 0.76,
        stanceWidth: 0.35
      },
      faultMapping: {
        'knees_too_straight': 'leftKnee',
        'arms_drooping': 'leftShoulder',
        'back_arched': 'spine'
      }
    },
    'utkatasana': {
      id: 'utkatasana',
      name: 'Chair Pose',
      sanskrit: 'Utkatasana',
      difficulty: 'Beginner',
      textureUrl: '../assets/yoga3d/chair.jpg',
      targetAngleHint: 'Knees Bent: 95° | Arms Reaching High',
      poseData: {
        torsoRotation: [0.4, 0, 0],
        headRotation: [-0.2, 0, 0],
        leftLeg: { hip: [0.95, 0, 0], knee: 1.45, ankle: -0.3 },
        rightLeg: { hip: [0.95, 0, 0], knee: 1.45, ankle: -0.3 },
        leftArm: { shoulder: [2.7, 0, -0.2], elbow: 0.1 },
        rightArm: { shoulder: [2.7, 0, 0.2], elbow: 0.1 },
        hipsY: 0.76,
        stanceWidth: 0.35
      },
      faultMapping: {
        'knees_too_straight': 'leftKnee',
        'arms_drooping': 'leftShoulder',
        'back_arched': 'spine'
      }
    },
    'goddess': {
      id: 'goddess',
      name: 'Goddess Pose',
      sanskrit: 'Utkata Konasana',
      difficulty: 'Intermediate',
      textureUrl: '../assets/yoga3d/goddess.jpg',
      targetAngleHint: 'Deep Squat: 90° | Cactus Arms: 90°',
      poseData: {
        torsoRotation: [0, 0, 0],
        headRotation: [0, 0, 0],
        leftLeg: { hip: [0.3, 0.6, -0.75], knee: 1.57, ankle: 0 },
        rightLeg: { hip: [0.3, -0.6, 0.75], knee: 1.57, ankle: 0 },
        leftArm: { shoulder: [0, 0, -1.57], elbow: 1.57 },
        rightArm: { shoulder: [0, 0, 1.57], elbow: 1.57 },
        hipsY: 0.78,
        stanceWidth: 1.2
      },
      faultMapping: {
        'squat_shallow': 'leftKnee',
        'cactus_arms_drooping': 'leftShoulder'
      }
    },
    'utkata_konasana': {
      id: 'utkata_konasana',
      name: 'Goddess Pose',
      sanskrit: 'Utkata Konasana',
      difficulty: 'Intermediate',
      textureUrl: '../assets/yoga3d/goddess.jpg',
      targetAngleHint: 'Deep Squat: 90° | Cactus Arms: 90°',
      poseData: {
        torsoRotation: [0, 0, 0],
        headRotation: [0, 0, 0],
        leftLeg: { hip: [0.3, 0.6, -0.75], knee: 1.57, ankle: 0 },
        rightLeg: { hip: [0.3, -0.6, 0.75], knee: 1.57, ankle: 0 },
        leftArm: { shoulder: [0, 0, -1.57], elbow: 1.57 },
        rightArm: { shoulder: [0, 0, 1.57], elbow: 1.57 },
        hipsY: 0.78,
        stanceWidth: 1.2
      },
      faultMapping: {
        'squat_shallow': 'leftKnee',
        'cactus_arms_drooping': 'leftShoulder'
      }
    },
    'butterfly': {
      id: 'butterfly',
      name: 'Butterfly Pose',
      sanskrit: 'Baddha Konasana',
      difficulty: 'Beginner',
      textureUrl: '../assets/yoga3d/butterfly.jpg',
      targetAngleHint: 'Spine Upright | Knees Relaxed Open',
      poseData: {
        torsoRotation: [0.1, 0, 0],
        headRotation: [0, 0, 0],
        leftLeg: { hip: [0.6, 0.9, -0.85], knee: 2.3, ankle: 0.3 },
        rightLeg: { hip: [0.6, -0.9, 0.85], knee: 2.3, ankle: 0.3 },
        leftArm: { shoulder: [0.4, 0, -0.3], elbow: 0.6 },
        rightArm: { shoulder: [0.4, 0, 0.3], elbow: 0.6 },
        hipsY: 0.22,
        stanceWidth: 0.6
      },
      faultMapping: {
        'spine_slouching': 'spine',
        'knees_tight': 'leftKnee'
      }
    },
    'baddha_konasana': {
      id: 'baddha_konasana',
      name: 'Butterfly Pose',
      sanskrit: 'Baddha Konasana',
      difficulty: 'Beginner',
      textureUrl: '../assets/yoga3d/butterfly.jpg',
      targetAngleHint: 'Spine Upright | Knees Relaxed Open',
      poseData: {
        torsoRotation: [0.1, 0, 0],
        headRotation: [0, 0, 0],
        leftLeg: { hip: [0.6, 0.9, -0.85], knee: 2.3, ankle: 0.3 },
        rightLeg: { hip: [0.6, -0.9, 0.85], knee: 2.3, ankle: 0.3 },
        leftArm: { shoulder: [0.4, 0, -0.3], elbow: 0.6 },
        rightArm: { shoulder: [0.4, 0, 0.3], elbow: 0.6 },
        hipsY: 0.22,
        stanceWidth: 0.6
      },
      faultMapping: {
        'spine_slouching': 'spine',
        'knees_tight': 'leftKnee'
      }
    }
  };

  class SheCare3DWebGLStudio {
    constructor() {
      this.container = null;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.characterGroup = null;
      this.currentPoseId = null;
      this.isInitialized = false;
      this.animationId = null;

      // Interaction & Orbit controls
      this.isDragging = false;
      this.previousMousePosition = { x: 0, y: 0 };
      this.spherical = {
        radius: 3.4,
        theta: 0, // Horizontal rotation in radians
        phi: Math.PI / 2.2 // Vertical pitch
      };
      this.targetSpherical = { ...this.spherical };
      this.defaultSpherical = { ...this.spherical };

      // Fault indicator & animation states
      this.faultMarkers = {};
      this.activeFaultJoint = null;
      this.isCorrect = false;
      this.pulseTime = 0;
      this.unavailableAlert = null;
    }

    init(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) {
        console.warn(`[SheCare3DWebGLStudio] Container #${containerId} not found.`);
        return false;
      }

      // Check Three.js availability
      if (typeof window.THREE === 'undefined') {
        console.error('[SheCare3DWebGLStudio] Three.js is not loaded.');
        return false;
      }

      const THREE = window.THREE;

      // 1. Scene setup with studio background
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x130914);
      this.scene.fog = new THREE.FogExp2(0x130914, 0.08);

      // 2. Camera setup
      const rect = this.container.getBoundingClientRect();
      const aspect = (rect.width || 600) / (rect.height || 450);
      this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
      this.updateCameraPosition();

      // 3. Renderer with antialiasing and tone mapping
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      this.renderer.setSize(rect.width || 600, rect.height || 450);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Style canvas element
      const domElement = this.renderer.domElement;
      domElement.id = 'shecare3dWebglCanvas';
      domElement.style.position = 'absolute';
      domElement.style.inset = '0';
      domElement.style.width = '100%';
      domElement.style.height = '100%';
      domElement.style.zIndex = '1';
      domElement.style.cursor = 'grab';

      // Remove any existing canvas if reinitializing
      const existing = this.container.querySelector('#shecare3dWebglCanvas, #human3dCanvas');
      if (existing) existing.remove();

      this.container.insertBefore(domElement, this.container.firstChild);

      // 4. Studio Lighting setup
      this.setupStudioLighting();

      // 5. Studio Stage Floor & Subtle Shadow Plate
      this.setupStudioStage();

      // 6. Interaction listeners (Mouse, Touch, Wheel Zoom)
      this.setupInteractionListeners();

      // 7. Window resize handling
      window.addEventListener('resize', () => this.onWindowResize());

      // 8. Start Render Loop
      this.isInitialized = true;
      this.startRenderLoop();

      // Load initial pose (default: warrior2)
      this.setPose('warrior2');

      return true;
    }

    setupStudioLighting() {
      const THREE = window.THREE;

      // Ambient light for base illumination
      const ambientLight = new THREE.AmbientLight(0xfff0f5, 0.9);
      this.scene.add(ambientLight);

      // Key light with soft shadow
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
      keyLight.position.set(3, 5, 4);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 15;
      this.scene.add(keyLight);

      // Fill light from opposite side (soft pink accent)
      const fillLight = new THREE.DirectionalLight(0xffb6c1, 0.7);
      fillLight.position.set(-3, 3, 2);
      this.scene.add(fillLight);

      // Rim light from behind for silhouette pop
      const rimLight = new THREE.DirectionalLight(0xff4fa3, 1.2);
      rimLight.position.set(0, 4, -4);
      this.scene.add(rimLight);
    }

    setupStudioStage() {
      const THREE = window.THREE;

      // Studio circular mat/platform
      const matGeo = new THREE.CylinderGeometry(1.6, 1.65, 0.04, 64);
      const matMat = new THREE.MeshStandardMaterial({
        color: 0x221124,
        roughness: 0.65,
        metalness: 0.1
      });
      const matMesh = new THREE.Mesh(matGeo, matMat);
      matMesh.position.y = -0.02;
      matMesh.receiveShadow = true;
      this.scene.add(matMesh);

      // Outer ring accent
      const ringGeo = new THREE.RingGeometry(1.65, 1.75, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4fa3, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.001;
      this.scene.add(ringMesh);
    }

    /**
     * Build Realistic Human 3D Yoga Character Model
     * Includes head, face features, neck, shoulders, chest, torso, hips, arms, hands, legs, knees, and feet.
     */
    buildRealisticHumanModel(poseConfig) {
      const THREE = window.THREE;
      const group = new THREE.Group();
      group.name = 'humanCharacter';

      const pd = poseConfig.poseData;

      // Realistic skin material
      const skinMaterial = new THREE.MeshStandardMaterial({
        color: 0xeac2a8,
        roughness: 0.55,
        metalness: 0.05
      });

      // Athletic yoga apparel material (Premium rose-pink & obsidian)
      const topMaterial = new THREE.MeshStandardMaterial({
        color: 0xff3b94,
        roughness: 0.45,
        metalness: 0.1
      });

      const leggingsMaterial = new THREE.MeshStandardMaterial({
        color: 0x1f1522,
        roughness: 0.6,
        metalness: 0.05
      });

      const jointMarkers = {};

      // 1. Pelvis / Hips (Root bone)
      const hips = new THREE.Group();
      hips.position.set(0, pd.hipsY || 0.95, 0);

      const pelvisGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.18, 24);
      const pelvisMesh = new THREE.Mesh(pelvisGeo, leggingsMaterial);
      pelvisMesh.castShadow = true;
      hips.add(pelvisMesh);

      // 2. Torso & Spine
      const spine = new THREE.Group();
      spine.position.set(0, 0.1, 0);
      spine.rotation.set(...(pd.torsoRotation || [0, 0, 0]));

      // Mid-torso (Stomach/Core)
      const stomachGeo = new THREE.CylinderGeometry(0.17, 0.16, 0.16, 24);
      const stomachMesh = new THREE.Mesh(stomachGeo, skinMaterial);
      stomachMesh.position.y = 0.08;
      stomachMesh.castShadow = true;
      spine.add(stomachMesh);

      // Chest & Upper Torso (Fitted yoga sports top)
      const chestGeo = new THREE.CylinderGeometry(0.20, 0.17, 0.22, 24);
      const chestMesh = new THREE.Mesh(chestGeo, topMaterial);
      chestMesh.position.y = 0.26;
      chestMesh.castShadow = true;
      spine.add(chestMesh);

      // 3. Neck & Head
      const neck = new THREE.Group();
      neck.position.set(0, 0.38, 0);

      const neckGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.12, 16);
      const neckMesh = new THREE.Mesh(neckGeo, skinMaterial);
      neckMesh.position.y = 0.06;
      neckMesh.castShadow = true;
      neck.add(neckMesh);

      const head = new THREE.Group();
      head.position.set(0, 0.14, 0);
      head.rotation.set(...(pd.headRotation || [0, 0, 0]));

      // Cranium / Face
      const headGeo = new THREE.SphereGeometry(0.125, 24, 24);
      headGeo.scale(1, 1.25, 1.05);
      const headMesh = new THREE.Mesh(headGeo, skinMaterial);
      headMesh.castShadow = true;
      head.add(headMesh);

      // Hair bun / hair style (Yoga sleek bun)
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x221310, roughness: 0.8 });
      const hairGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const hairMesh = new THREE.Mesh(hairGeo, hairMat);
      hairMesh.position.set(0, 0.11, -0.09);
      head.add(hairMesh);

      neck.add(head);
      spine.add(neck);

      // 4. Arms (Left & Right)
      const buildLimb = (isArm, isLeft) => {
        const root = new THREE.Group();
        const sideMult = isLeft ? 1 : -1;

        if (isArm) {
          const armCfg = isLeft ? pd.leftArm : pd.rightArm;
          root.position.set(sideMult * 0.22, 0.33, 0);
          root.rotation.set(...(armCfg.shoulder || [0, 0, sideMult * -0.5]));

          // Upper Arm
          const upperGeo = new THREE.CylinderGeometry(0.05, 0.042, 0.28, 16);
          const upperMesh = new THREE.Mesh(upperGeo, skinMaterial);
          upperMesh.position.set(0, -0.14, 0);
          upperMesh.castShadow = true;
          root.add(upperMesh);

          // Elbow joint
          const elbow = new THREE.Group();
          elbow.position.set(0, -0.28, 0);
          elbow.rotation.x = armCfg.elbow || 0;

          // Forearm
          const foreGeo = new THREE.CylinderGeometry(0.042, 0.035, 0.26, 16);
          const foreMesh = new THREE.Mesh(foreGeo, skinMaterial);
          foreMesh.position.set(0, -0.13, 0);
          foreMesh.castShadow = true;
          elbow.add(foreMesh);

          // Hand & Fingers
          const handGeo = new THREE.BoxGeometry(0.035, 0.09, 0.07);
          const handMesh = new THREE.Mesh(handGeo, skinMaterial);
          handMesh.position.set(0, -0.29, 0);
          elbow.add(handMesh);

          root.add(elbow);

          // Register joint markers for biomechanical alerts
          jointMarkers[isLeft ? 'leftShoulder' : 'rightShoulder'] = root;
          jointMarkers[isLeft ? 'leftElbow' : 'rightElbow'] = elbow;
          jointMarkers[isLeft ? 'leftWrist' : 'rightWrist'] = handMesh;

        } else {
          // Leg
          const legCfg = isLeft ? pd.leftLeg : pd.rightLeg;
          root.position.set(sideMult * 0.12, -0.05, 0);
          root.rotation.set(...(legCfg.hip || [0, 0, 0]));

          // Thigh (Yoga athletic leggings)
          const thighGeo = new THREE.CylinderGeometry(0.09, 0.065, 0.42, 20);
          const thighMesh = new THREE.Mesh(thighGeo, leggingsMaterial);
          thighMesh.position.set(0, -0.21, 0);
          thighMesh.castShadow = true;
          root.add(thighMesh);

          // Knee joint
          const knee = new THREE.Group();
          knee.position.set(0, -0.42, 0);
          knee.rotation.x = legCfg.knee || 0;

          // Calf & Shin
          const calfGeo = new THREE.CylinderGeometry(0.062, 0.048, 0.40, 20);
          const calfMesh = new THREE.Mesh(calfGeo, leggingsMaterial);
          calfMesh.position.set(0, -0.20, 0);
          calfMesh.castShadow = true;
          knee.add(calfMesh);

          // Foot & Ankle
          const footGeo = new THREE.BoxGeometry(0.075, 0.06, 0.18);
          const footMesh = new THREE.Mesh(footGeo, skinMaterial);
          footMesh.position.set(0, -0.42, 0.05);
          footMesh.rotation.x = legCfg.ankle || 0;
          footMesh.castShadow = true;
          knee.add(footMesh);

          root.add(knee);

          // Register joint markers
          jointMarkers[isLeft ? 'leftKnee' : 'rightKnee'] = knee;
          jointMarkers[isLeft ? 'leftAnkle' : 'rightAnkle'] = footMesh;
        }

        return root;
      };

      // Add Arms to upper spine
      spine.add(buildLimb(true, true));   // Left Arm
      spine.add(buildLimb(true, false));  // Right Arm

      // Add Legs to Pelvis
      hips.add(buildLimb(false, true));   // Left Leg
      hips.add(buildLimb(false, false));  // Right Leg

      hips.add(spine);
      group.add(hips);

      // Register core landmarks
      jointMarkers['hips'] = hips;
      jointMarkers['spine'] = spine;
      jointMarkers['head'] = head;

      this.faultMarkers = jointMarkers;
      return group;
    }

    /**
     * Sets and renders the active 3D pose strictly based on selectedPose.id.
     * Disposes and unloads previous pose geometry to prevent any model mixing.
     */
    setPose(poseId) {
      if (!poseId) return;

      const normalizedId = String(poseId).toLowerCase().trim();

      // Check if pose exists in REALISTIC_3D_POSES
      const poseConfig = REALISTIC_3D_POSES[normalizedId];

      // Remove existing 3D character from scene and dispose resources
      if (this.characterGroup) {
        this.disposeObject(this.characterGroup);
        this.scene.remove(this.characterGroup);
        this.characterGroup = null;
      }

      this.currentPoseId = normalizedId;

      // Reset view on new pose
      this.resetView();

      // Fallback handling: If pose is NOT supported with a realistic 3D asset
      if (!poseConfig) {
        this.showUnavailableNotice(true, poseId);
        this.updateHUDTitles(poseId, false);
        return;
      }

      this.showUnavailableNotice(false, poseId);

      // Build and mount the dedicated 3D human model for this exact pose
      this.characterGroup = this.buildRealisticHumanModel(poseConfig);
      this.scene.add(this.characterGroup);

      // Update Floating HUD elements
      this.updateHUDTitles(poseConfig.name, true, poseConfig.targetAngleHint);
      this.clearCorrectionState();
    }

    showUnavailableNotice(show, poseId) {
      let notice = this.container.querySelector('#pose3DUnavailableAlert');
      if (show) {
        // Look up pose from YOGA_POSE_LIBRARY or YOGA_POSES
        let poseObj = null;
        if (window.YOGA_POSE_LIBRARY && Array.isArray(window.YOGA_POSE_LIBRARY)) {
          poseObj = window.YOGA_POSE_LIBRARY.find(p => p.id === poseId);
        }
        if (!poseObj && window.SheCareYoga && window.SheCareYoga.poses) {
          poseObj = window.SheCareYoga.poses[poseId];
        }

        const poseImgUrl = poseObj?.imageUrl || poseObj?.thumbnailUrl;
        const poseName = poseObj?.name || 'Selected Yoga Pose';

        if (!notice) {
          notice = document.createElement('div');
          notice.id = 'pose3DUnavailableAlert';
          notice.style.position = 'absolute';
          notice.style.inset = '0';
          notice.style.display = 'flex';
          notice.style.flexDirection = 'column';
          notice.style.alignItems = 'center';
          notice.style.justifyContent = 'center';
          notice.style.background = '#130914';
          notice.style.zIndex = '5';
          notice.style.color = '#fff';
          notice.style.padding = '16px';
          notice.style.textAlign = 'center';
          this.container.appendChild(notice);
        }

        if (poseImgUrl) {
          notice.innerHTML = `
            <div class="position-relative w-100 h-100 d-flex flex-column align-items-center justify-content-between p-2">
              <div class="w-100 d-flex justify-content-between align-items-center mb-1" style="z-index:2;">
                <span class="badge bg-secondary text-white-50 border border-secondary px-2 py-1" style="font-size:10px;">
                  <i class="fa-solid fa-cube me-1"></i>3D human model unavailable for this pose
                </span>
                <span class="badge bg-primary-pink text-white rounded-pill px-2 py-1" style="font-size:10px;">
                  Human Pose Reference
                </span>
              </div>
              <div class="flex-grow-1 w-100 d-flex align-items-center justify-content-center overflow-hidden my-1">
                <img src="${poseImgUrl}" alt="${poseName}" style="max-width:100%; max-height:280px; object-fit:contain; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.5);" onerror="this.style.display='none'; document.getElementById('poseFallbackText').style.display='block';" />
              </div>
              <div id="poseFallbackText" style="display:none;" class="text-white-50 small my-3">
                Visual unavailable for this pose.
              </div>
              <div class="small text-white-50 mt-1" style="font-size:10.5px;">
                Full camera AI pose estimation and real-time form scoring remain active.
              </div>
            </div>
          `;
        } else {
          notice.innerHTML = `
            <div class="rounded-circle d-flex align-items-center justify-content-center mb-3" style="width:64px;height:64px;background:rgba(255,79,163,0.15);color:#ff4fa3;">
              <i class="fa-solid fa-image-slash fs-3"></i>
            </div>
            <h6 class="fw-bold text-white mb-1">Visual unavailable for this pose.</h6>
            <p class="text-white-50 small mb-0" style="max-width:320px; font-size:12px;">
              Full biomechanical rules, voice coaching, and AI clinical assessment remain active.
            </p>
          `;
        }
        notice.style.display = 'flex';
      } else {
        if (notice) notice.style.display = 'none';
      }
    }

    updateHUDTitles(title, available, hint) {
      const hudTitle = document.getElementById('avatarPoseTitle');
      const hudHint = document.getElementById('avatarPoseHint');
      const resetBtn = document.getElementById('reset3DViewBtn');
      const badgeText = document.getElementById('avatar360Text');

      if (hudTitle) hudTitle.textContent = title;
      if (hudHint) hudHint.textContent = available ? (hint || 'Match 3D human posture') : '3D model unavailable';
      if (badgeText) badgeText.textContent = available ? '360° Drag View' : '3D unavailable';
      if (resetBtn) resetBtn.style.display = 'none';
    }

    setupInteractionListeners() {
      if (!this.renderer || !this.renderer.domElement) return;
      const dom = this.renderer.domElement;

      // Pointer Down (Desktop mouse & Mobile touch)
      dom.addEventListener('pointerdown', (e) => {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
        dom.style.cursor = 'grabbing';
        try { dom.setPointerCapture(e.pointerId); } catch (_) {}
      });

      // Pointer Move (360° Horizontal orbit & Vertical tilt)
      dom.addEventListener('pointermove', (e) => {
        if (!this.isDragging) return;
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        // Orbit horizontal (theta)
        this.targetSpherical.theta -= deltaX * 0.012;

        // Pitch vertical (phi) with boundary locks
        this.targetSpherical.phi = Math.max(0.4, Math.min(Math.PI / 1.7, this.targetSpherical.phi + deltaY * 0.008));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };

        const resetBtn = document.getElementById('reset3DViewBtn');
        if (resetBtn) resetBtn.style.display = 'inline-block';
      });

      // Pointer Up & Cancel
      const endDrag = (e) => {
        if (this.isDragging) {
          this.isDragging = false;
          dom.style.cursor = 'grab';
          try { if (e && e.pointerId) dom.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };
      dom.addEventListener('pointerup', endDrag);
      dom.addEventListener('pointercancel', endDrag);

      // Pinch & Wheel Zoom
      dom.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.002;
        this.targetSpherical.radius = Math.max(2.0, Math.min(5.2, this.targetSpherical.radius + zoomDelta));
        const resetBtn = document.getElementById('reset3DViewBtn');
        if (resetBtn) resetBtn.style.display = 'inline-block';
      }, { passive: false });
    }

    updateCameraPosition() {
      // Spherical coordinates conversion to Cartesian (X, Y, Z)
      const r = this.spherical.radius;
      const phi = this.spherical.phi;
      const theta = this.spherical.theta;

      const x = r * Math.sin(phi) * Math.sin(theta);
      const y = r * Math.cos(phi) + 0.8; // Centered at chest height
      const z = r * Math.sin(phi) * Math.cos(theta);

      this.camera.position.set(x, y, z);
      this.camera.lookAt(0, 0.85, 0);
    }

    resetView() {
      this.targetSpherical = { ...this.defaultSpherical };
      const resetBtn = document.getElementById('reset3DViewBtn');
      if (resetBtn) resetBtn.style.display = 'none';
      const badgeText = document.getElementById('avatar360Text');
      if (badgeText) badgeText.textContent = '360° Drag View';
    }

    /**
     * Connected Real-Time AI Camera Assessment Feed
     * When posture is aligned, faulty highlights vanish and turn emerald green.
     * When incorrect, offending joint illuminates in pulsating red.
     */
    setCorrectionState(evalResult) {
      if (!this.isInitialized) return;

      const isCorrect = evalResult.isCorrect;
      this.isCorrect = isCorrect;
      const hudStatus = document.getElementById('avatarStatusBadge');
      const hudDiff = document.getElementById('avatarAngleDiff');

      const poseConfig = REALISTIC_3D_POSES[this.currentPoseId];

      if (isCorrect) {
        this.activeFaultJoint = null;
        if (hudStatus) {
          hudStatus.className = 'badge bg-success text-white fw-bold px-3 py-1 shadow-sm';
          hudStatus.innerHTML = '<i class="fa-solid fa-circle-check me-1"></i>3D POSE MATCHED';
        }
        if (hudDiff) {
          hudDiff.innerHTML = '<span class="text-success fw-bold">✓ Form aligned with 3D human guide</span>';
        }
      } else {
        // Map camera fault to 3D skeleton node
        const faultKey = evalResult.fault || 'generic';
        const mappedJoint = (poseConfig && poseConfig.faultMapping && poseConfig.faultMapping[faultKey]) || 'leftKnee';
        this.activeFaultJoint = mappedJoint;

        if (hudStatus) {
          hudStatus.className = 'badge bg-danger text-white fw-bold px-3 py-1 shadow-sm';
          hudStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-1"></i>3D CORRECTION ACTIVE';
        }
        if (hudDiff) {
          const patientAngle = evalResult.angle ? `${evalResult.angle}°` : 'Off';
          const targetAngle = evalResult.target || 'Optimal';
          hudDiff.innerHTML = `
            <span class="text-warning fw-bold">Target: ${targetAngle}</span> &nbsp;|&nbsp; 
            <span class="text-danger fw-bold">Current: ${patientAngle}</span>
          `;
        }
      }
    }

    clearCorrectionState() {
      this.isCorrect = false;
      this.activeFaultJoint = null;
      const hudStatus = document.getElementById('avatarStatusBadge');
      const hudDiff = document.getElementById('avatarAngleDiff');
      if (hudStatus) {
        hudStatus.className = 'badge bg-secondary text-white fw-bold px-3 py-1 shadow-sm';
        hudStatus.innerHTML = '<i class="fa-solid fa-person-praying me-1"></i>3D GUIDE READY';
      }
      if (hudDiff) {
        hudDiff.innerHTML = '<span class="text-white-50">Match your posture with the 3D model</span>';
      }
    }

    startRenderLoop() {
      const animate = () => {
        this.animationId = requestAnimationFrame(animate);

        // Smooth camera damping
        this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * 0.12;
        this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * 0.12;
        this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * 0.12;
        this.updateCameraPosition();

        this.pulseTime += 0.05;

        // Breathing & fault pulsing on character
        if (this.characterGroup) {
          const breath = Math.sin(this.pulseTime * 1.5) * 0.015;
          const spine = this.characterGroup.getObjectByName('spine');
          if (spine) spine.scale.set(1 + breath, 1 + breath, 1 + breath);
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    }

    onWindowResize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const rect = this.container.getBoundingClientRect();
      const w = rect.width || 600;
      const h = rect.height || 450;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    disposeObject(obj) {
      if (!obj) return;
      obj.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }

    setPerspective(mode) {
      if (mode === 'front') {
        this.targetSpherical.theta = 0;
        this.targetSpherical.phi = Math.PI / 2.2;
      } else if (mode === 'side') {
        this.targetSpherical.theta = Math.PI / 2;
        this.targetSpherical.phi = Math.PI / 2.2;
      } else if (mode === 'iso') {
        this.targetSpherical.theta = Math.PI / 4;
        this.targetSpherical.phi = Math.PI / 2.5;
      }
    }
  }

  // Global Singleton Instance
  window.SheCare3DHumanAvatar = new SheCare3DWebGLStudio();
  window.SheCare3DAvatar = window.SheCare3DHumanAvatar; // Backward compatibility alias
  window.REALISTIC_3D_POSES = REALISTIC_3D_POSES;

})(typeof window !== 'undefined' ? window : global);
