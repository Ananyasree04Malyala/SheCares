# SheCares AI Yoga Pose & Alignment Engine

## 1. Specifications & Pipeline
- **Input**: Video stream from patient's camera (`getUserMedia` with mirrored high-DPI canvas overlay).
- **Landmark Extractor**: MediaPipe Pose WASM pipeline detecting 33 full-body landmarks:
  - Upper body: Nose, shoulders (11, 12), elbows (13, 14), wrists (15, 16)
  - Lower body: Hips (23, 24), knees (25, 26), ankles (27, 28), feet (31, 32)
- **Joint-Angle Engine**: Computes 3D joint angles using 3-point vector trigonometry (`Math.atan2` differential with dot-product cross checks).

## 2. Pose Switching & Single Source of Truth
When the user selects any pose from the library:
1. `selectPose(poseId)` retrieves the complete pose definition from `YogaPoseLibrary`.
2. All UI components update simultaneously:
   - Pose title, Sanskrit title, and category badge
   - Target reference human demonstration image
   - Detailed instructions and alignment tips
   - Precautions and target muscles
   - Telemetry targets and angle matrices
3. The countdown timer and score state reset cleanly.
4. MediaPipe detection targets update dynamically to the selected pose's rules.

## 3. Real-Time Posture Correction Gating
- **Freeze Mechanism**: The timer ticks down only while all biomechanical constraints for the active pose are satisfied.
- **Fault Annunciation**: The exact joint index is highlighted with a pulsing radar ring on the camera overlay.
- **Voice Feedback**: Debounced speech synthesis announces corrective cues (e.g., *"Right arm is drooping, raise arm level with shoulders"*).
- **Auto-Resumption**: The timer resumes the instant correct alignment is restored.
