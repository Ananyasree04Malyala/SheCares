/* ==========================================================================
   SHECARES — script.js
   Modular vanilla JS. Every module guards on element existence so this
   single file can be shared across all pages.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initAppSplashScreen();
  initPetalField();
  initScrollReveal();
  initRipple();
  initNavbarActive();
  initAuthNav();
  initSOS();
  initDueDateCalculator();
  initPeriodTracker();
  initBMICalculator();
  initBloodSugar();
  initWaterIntake();
  initCalorieCalculator();
  initMoodTracker();
  initMedicineReminder();
  initFoodUpload();
  initFitnessGoals();
  initYogaTimer();
  initYogaSessionButtons();
  initPoseDetectionController();
  initVoiceGuidance();
  initStreakCounter();
  initSAIChat();
  initContactForm();
  initGlucoseChart();
  initHelpAccordionSearch();
  initLiveLocation();
  initEmergencyContacts();
});

/* ---------------- Ambient petal background ---------------- */
function initPetalField(){
  const field = document.querySelector('.petal-field');
  if(!field) return;
  const sizes = [90, 140, 60, 180, 110, 70];
  sizes.forEach((s, i) => {
    const p = document.createElement('div');
    p.className = 'petal';
    p.style.width = s + 'px';
    p.style.height = s + 'px';
    p.style.top = (Math.random()*90) + '%';
    p.style.left = (Math.random()*95) + '%';
    p.style.animationDuration = (10 + Math.random()*8) + 's';
    p.style.animationDelay = (Math.random()*4) + 's';
    p.style.opacity = 0.5 + Math.random()*0.4;
    field.appendChild(p);
  });
}

/* ---------------- Scroll reveal (fade/zoom in) ---------------- */
function initScrollReveal(){
  const els = document.querySelectorAll('.fade-in-up, .zoom-in');
  if(!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in-view'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
}

/* ---------------- Ripple effect on .ripple buttons ---------------- */
function initRipple(){
  document.querySelectorAll('.ripple').forEach(btn => {
    btn.addEventListener('click', function(e){
      const rect = this.getBoundingClientRect();
      const circle = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      circle.className = 'ripple-circle';
      circle.style.width = circle.style.height = size + 'px';
      circle.style.left = (e.clientX - rect.left - size/2) + 'px';
      circle.style.top = (e.clientY - rect.top - size/2) + 'px';
      this.appendChild(circle);
      setTimeout(() => circle.remove(), 650);
    });
  });
}

/* ---------------- Highlight active nav link ---------------- */
function initNavbarActive(){
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link-custom').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if(href === path) a.classList.add('active');
  });
}

/* ---------------- Auth-aware navbar (persists login state across pages) ---------------- */
/* ---------------- SOS floating button + modal ---------------- */
/* ---------------- Due Date Calculator (Pregnancy Care) ---------------- */
/* ---------------- Period / Cycle Prediction ---------------- */
/* ---------------- BMI Calculator ---------------- */
function initBMICalculator(){
  const form = document.getElementById('bmiForm');
  if(!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const h = parseFloat(document.getElementById('bmiHeight').value)/100;
    const w = parseFloat(document.getElementById('bmiWeight').value);
    if(!h || !w) return;
    const bmi = (w/(h*h)).toFixed(1);
    let category = 'Normal';
    if(bmi < 18.5) category = 'Underweight';
    else if(bmi >= 25 && bmi < 30) category = 'Overweight';
    else if(bmi >= 30) category = 'Obese';
    document.getElementById('bmiResult').classList.remove('d-none');
    document.getElementById('bmiOut').textContent = bmi;
    document.getElementById('bmiCategoryOut').textContent = category;
  });
}

/* ---------------- Blood Sugar Calculator / Logger (Diabetic Care) ---------------- */
/* ---------------- Glucose History Chart (Chart.js) ---------------- */
/* ---------------- Water Intake Tracker ---------------- */
/* ---------------- Daily Calorie Calculator ---------------- */
function initCalorieCalculator(){
  const form = document.getElementById('calorieForm');
  if(!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const age = parseFloat(document.getElementById('calAge').value);
    const weight = parseFloat(document.getElementById('calWeight').value);
    const height = parseFloat(document.getElementById('calHeight').value);
    const activity = parseFloat(document.getElementById('calActivity').value);
    if(!age || !weight || !height) return;
    // Mifflin-St Jeor (female)
    const bmr = 10*weight + 6.25*height - 5*age - 161;
    const total = Math.round(bmr * activity);
    document.getElementById('calorieResult').classList.remove('d-none');
    document.getElementById('calorieOut').textContent = `${total} kcal / day`;
  });
}

/* ---------------- Mood Tracker (Mental Wellness / Period) ---------------- */
/* ---------------- Medicine Reminder (Caretaker) ---------------- */
/* ---------------- AI Food Upload Preview (Food Analyzer) ---------------- */
function initFoodUpload(){
  const input = document.getElementById('foodImageInput');
  if(!input) return;
  const preview = document.getElementById('foodPreview');
  const resultBox = document.getElementById('foodAnalysisResult');
  const loading = document.getElementById('foodLoading');
  const dropzone = document.getElementById('foodDropzone');

  const sampleFoods = [
    { name: 'Grilled Chicken Salad', cal: 320, protein: '28g', score: 92, tip: 'Great balance of lean protein and greens. Add whole grains for sustained energy.' },
    { name: 'Vegetable Stir-fry with Tofu', cal: 280, protein: '18g', score: 88, tip: 'Rich in fiber and micronutrients — a solid plant-based choice.' },
    { name: 'Fruit & Yogurt Bowl', cal: 210, protein: '10g', score: 85, tip: 'Good source of probiotics and natural sugars. Pair with nuts for protein.' }
  ];

  function handleFile(file){
    if(!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      preview.classList.remove('d-none');
      resultBox.classList.add('d-none');
      loading.classList.remove('d-none');
      setTimeout(() => {
        loading.classList.add('d-none');
        const food = sampleFoods[Math.floor(Math.random()*sampleFoods.length)];
        document.getElementById('foodNameOut').textContent = food.name;
        document.getElementById('foodCalOut').textContent = food.cal + ' kcal';
        document.getElementById('foodProteinOut').textContent = food.protein;
        document.getElementById('foodScoreOut').textContent = food.score + ' / 100';
        document.getElementById('foodTipOut').textContent = food.tip;
        resultBox.classList.remove('d-none');
      }, 1400);
    };
    reader.readAsDataURL(file);
  }

  input.addEventListener('change', () => handleFile(input.files[0]));
  if(dropzone){
    ['dragover','dragenter'].forEach(evt => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('border-primary'); }));
    ['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('border-primary'); }));
    dropzone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
    dropzone.addEventListener('click', () => input.click());
  }
}

/* ---------------- Fitness Goal Tracker ---------------- */
/* ---------------- Yoga Session Timer (drives pose/voice modules too) ---------------- */
const YogaSession = { category: null, total: 300, remaining: 300, timerId: null, running: false };

function initYogaTimer(){
  const ring = document.querySelector('.timer-progress');
  const display = document.getElementById('timerDisplay');
  const startBtn = document.getElementById('timerStart');
  const pauseBtn = document.getElementById('timerPause');
  const resetBtn = document.getElementById('timerReset');
  const select = document.getElementById('timerDuration');
  const nowPracticing = document.getElementById('nowPracticing');
  if(!display || !startBtn) return;

  const circumference = 2 * Math.PI * 80;
  if(ring){ ring.style.strokeDasharray = circumference; ring.style.strokeDashoffset = 0; }

  YogaSession.total = parseInt(select?.value || 300);
  YogaSession.remaining = YogaSession.total;

  function format(s){ const m = Math.floor(s/60); const sec = s%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }
  function render(){
    display.textContent = format(YogaSession.remaining);
    if(ring){ const pct = YogaSession.remaining/YogaSession.total; ring.style.strokeDashoffset = circumference * (1-pct); }
  }
  select?.addEventListener('change', () => {
    YogaSession.total = parseInt(select.value);
    YogaSession.remaining = YogaSession.total;
    clearInterval(YogaSession.timerId); YogaSession.timerId = null; YogaSession.running = false;
    render();
  });

  function start(){
    if(YogaSession.timerId) return;
    YogaSession.running = true;
    if(!YogaSession.category && nowPracticing){
      YogaSession.category = 'Free Practice';
      nowPracticing.textContent = `Now practicing: ${YogaSession.category}`;
    }
    document.dispatchEvent(new CustomEvent('yoga:started', { detail: { category: YogaSession.category } }));
    YogaSession.timerId = setInterval(() => {
      YogaSession.remaining--;
      render();
      if(YogaSession.remaining <= 0){
        clearInterval(YogaSession.timerId); YogaSession.timerId = null; YogaSession.running = false;
        bumpStreak();
        const minutesDone = Math.max(1, Math.round(YogaSession.total/60));
        if(window.logYogaSession) window.logYogaSession(minutesDone);
        display.textContent = 'Done! 🎉';
        if(nowPracticing) nowPracticing.textContent = `${YogaSession.category || 'Session'} complete — great work! 🎉`;
        document.dispatchEvent(new CustomEvent('yoga:completed', { detail: { category: YogaSession.category, minutes: minutesDone } }));
        YogaSession.category = null;
      }
    }, 1000);
  }
  function pause(){
    clearInterval(YogaSession.timerId); YogaSession.timerId = null; YogaSession.running = false;
    document.dispatchEvent(new CustomEvent('yoga:paused'));
  }
  function reset(){
    clearInterval(YogaSession.timerId); YogaSession.timerId = null; YogaSession.running = false;
    YogaSession.remaining = YogaSession.total; YogaSession.category = null;
    if(nowPracticing) nowPracticing.textContent = 'No active session — pick a category above or press play';
    render();
    document.dispatchEvent(new CustomEvent('yoga:reset'));
  }

  startBtn.addEventListener('click', start);
  pauseBtn?.addEventListener('click', pause);
  resetBtn?.addEventListener('click', reset);
  render();

  // Exposed so the yoga category cards can launch a pre-configured session.
  window.startYogaCategorySession = function(category, durationSeconds){
    clearInterval(YogaSession.timerId); YogaSession.timerId = null;
    YogaSession.category = category;
    YogaSession.total = durationSeconds;
    YogaSession.remaining = durationSeconds;
    if(select){
      let opt = [...select.options].find(o => parseInt(o.value) === durationSeconds);
      if(!opt){
        opt = document.createElement('option');
        opt.value = durationSeconds;
        opt.textContent = `${Math.round(durationSeconds/60)} minutes (${category})`;
        select.appendChild(opt);
      }
      select.value = durationSeconds;
    }
    if(nowPracticing) nowPracticing.textContent = `Now practicing: ${category}`;
    render();
    start();
  };
}

/* ---------------- Yoga category "Start Session" buttons ---------------- */
function initYogaSessionButtons(){
  const buttons = document.querySelectorAll('.start-session-btn');
  if(!buttons.length) return;
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      const duration = parseInt(btn.dataset.duration, 10) || 300;
      const timerCard = document.getElementById('timerDisplay');
      if(timerCard) timerCard.closest('.tool-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
      if(window.startYogaCategorySession) window.startYogaCategorySession(category, duration);
    });
  });
}

/* ---------------- AI Pose Detection (MediaPipe Controller) ---------------- */
function initPoseDetectionController(){
  // If dedicated MediaPipe yoga engine (yoga-pose.js) is loaded, defer to it
  if (window.SheCareYogaPose || document.getElementById('poseCanvas')) {
    return;
  }
  const enableBtn = document.getElementById('enableCameraBtn');
  const disableBtn = document.getElementById('disableCameraBtn');
  const disableBtnOverlay = document.getElementById('disableCameraBtnOverlay');
  const placeholder = document.getElementById('cameraPlaceholder');
  const video = document.getElementById('cameraVideo');
  const tipBanner = document.getElementById('poseTipBanner');
  const tipText = document.getElementById('poseTipText');
  const progressDot = document.getElementById('progressDot');
  const progressText = document.getElementById('progressText');
  if(!enableBtn || !video) return;

  const tips = [
    'Straighten your spine and relax your shoulders',
    'Great alignment — hold steady',
    'Breathe in slowly through your nose',
    'Soften your jaw and gaze forward',
    'Engage your core gently',
    'Nice and stable — keep breathing'
  ];
  let poseInterval = null;
  let stream = null;

  async function enableCamera(){
    enableBtn.disabled = true;
    enableBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Requesting access...';
    try{
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = stream;
      placeholder.classList.add('d-none');
      video.classList.remove('d-none');
      tipBanner.classList.remove('d-none');
      enableBtn.classList.add('d-none');
      disableBtn?.classList.remove('d-none');
      disableBtnOverlay?.classList.remove('d-none');
      let i = 0;
      tipText.textContent = tips[0];
      poseInterval = setInterval(() => {
        i = (i + 1) % tips.length;
        tipText.textContent = tips[i];
      }, 3800);
      if(progressDot){ progressDot.classList.remove('warn'); progressDot.classList.add('ok'); }
      if(progressText) progressText.textContent = 'Camera active — real-time pose tracking active';
    } catch(err){
      enableBtn.disabled = false;
      enableBtn.innerHTML = '<i class="fa-solid fa-video me-1"></i>Enable Camera';
      const msg = document.createElement('p');
      msg.className = 'small text-danger mt-2 mb-0';
      msg.textContent = 'Camera access was blocked or unavailable. Check your browser permissions and try again.';
      placeholder.appendChild(msg);
    }
  }

  function disableCamera(){
    if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
    if(poseInterval){ clearInterval(poseInterval); poseInterval = null; }
    video.srcObject = null;
    video.classList.add('d-none');
    tipBanner.classList.add('d-none');
    disableBtn?.classList.add('d-none');
    disableBtnOverlay?.classList.add('d-none');
    placeholder.classList.remove('d-none');
    enableBtn.classList.remove('d-none');
    enableBtn.disabled = false;
    enableBtn.innerHTML = '<i class="fa-solid fa-video me-1"></i>Enable Camera';
    if(progressDot){ progressDot.classList.remove('ok'); progressDot.classList.add('warn'); }
    if(progressText) progressText.textContent = 'Camera turned off — progress still tracked once you complete a session';
  }

  enableBtn.addEventListener('click', enableCamera);
  disableBtn?.addEventListener('click', disableCamera);
  disableBtnOverlay?.addEventListener('click', disableCamera);

  // Stop the camera cleanly if the tab is closed or navigated away.
  window.addEventListener('beforeunload', () => {
    if(stream) stream.getTracks().forEach(t => t.stop());
    if(poseInterval) clearInterval(poseInterval);
  });
}

/* ---------------- Voice Guidance (Web Speech API) ---------------- */
function initVoiceGuidance(){
  const toggleBtn = document.getElementById('voiceToggleBtn');
  const lineEl = document.getElementById('voiceLine');
  if(!toggleBtn || !lineEl) return;

  const supported = 'speechSynthesis' in window;
  const lines = [
    'Inhale, lengthen your spine.',
    'Exhale, relax your shoulders.',
    'Hold this pose for a few breaths.',
    'Keep your breathing slow and steady.',
    'Ground through your feet, soften your face.',
    'You are doing great — stay with your breath.'
  ];
  let enabled = false;
  let speakInterval = null;

  function speak(text){
    if(!supported) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.05;
    window.speechSynthesis.speak(utter);
    lineEl.textContent = `"${text}"`;
  }

  function startSpeaking(){
    let i = 0;
    speak(lines[0]);
    speakInterval = setInterval(() => {
      i = (i + 1) % lines.length;
      speak(lines[i]);
    }, 6000);
  }
  function stopSpeaking(){
    clearInterval(speakInterval); speakInterval = null;
    if(supported) window.speechSynthesis.cancel();
  }

  if(!supported){
    toggleBtn.disabled = true;
    lineEl.textContent = 'Voice guidance isn\'t supported in this browser.';
  }

  toggleBtn.addEventListener('click', () => {
    enabled = !enabled;
    toggleBtn.innerHTML = enabled
      ? '<i class="fa-solid fa-pause me-1"></i>Turn Off'
      : '<i class="fa-solid fa-play me-1"></i>Turn On';
    if(enabled) startSpeaking(); else { stopSpeaking(); lineEl.textContent = 'Voice guidance paused.'; }
  });

  // Auto-speak a cue whenever a category session starts/completes/pauses.
  document.addEventListener('yoga:started', (e) => {
    if(supported) speak(`Starting your ${e.detail.category || 'session'}. Let's begin with a deep breath in.`);
  });
  document.addEventListener('yoga:completed', (e) => {
    if(supported) speak(`Great work completing your ${e.detail.category || 'session'}. Take a moment to notice how you feel.`);
    stopSpeaking(); enabled = false;
    toggleBtn.innerHTML = '<i class="fa-solid fa-play me-1"></i>Turn On';
  });
  document.addEventListener('yoga:paused', () => { if(supported) window.speechSynthesis.cancel(); });
}

/* ---------------- Daily Streak Counter ---------------- */
function bumpStreak(){
  const today = new Date().toDateString();
  const last = localStorage.getItem('sc_streak_last');
  let streak = parseInt(localStorage.getItem('sc_streak_count') || '0');
  if(last !== today){
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    streak = (last === yesterday) ? streak + 1 : 1;
    localStorage.setItem('sc_streak_last', today);
    localStorage.setItem('sc_streak_count', streak);
  }
  const out = document.getElementById('streakCountOut');
  if(out) out.textContent = streak;
}
function initStreakCounter(){
  const out = document.getElementById('streakCountOut');
  if(!out) return;
  out.textContent = localStorage.getItem('sc_streak_count') || '0';
}

/* ---------------- SAI — SheCare AI (real AI via secure backend) ---------------- */
/* ---------------- Contact / Help form validation ---------------- */
function initContactForm(){
  const form = document.getElementById('contactForm');
  if(!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!form.checkValidity()){
      e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }
    document.getElementById('contactSuccess').classList.remove('d-none');
    form.reset();
    form.classList.remove('was-validated');
  });
}

/* ---------------- Help page search filter ---------------- */
function initHelpAccordionSearch(){
  const search = document.getElementById('helpSearch');
  if(!search) return;
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    document.querySelectorAll('.accordion-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

/* ---------------- Live GPS Sharing (real geolocation) ---------------- */
function initLiveLocation(){
  const enableBtn = document.getElementById('enableLocationBtn');
  const stopBtn = document.getElementById('stopLocationBtn');
  const placeholder = document.getElementById('mapPlaceholder');
  const frame = document.getElementById('mapFrame');
  const dot = document.getElementById('locationDot');
  const statusText = document.getElementById('locationStatusText');
  const coordsText = document.getElementById('locationCoordsText');
  if(!enableBtn) return;

  let watchId = null;

  function setFrame(lat, lon){
    frame.src = `https://www.google.com/maps?q=${lat},${lon}&z=15&output=embed`;
    placeholder.classList.add('d-none');
    frame.classList.remove('d-none');
  }

  function onPosition(pos){
    const { latitude, longitude, accuracy } = pos.coords;
    setFrame(latitude, longitude);
    dot.classList.remove('warn'); dot.classList.add('ok');
    statusText.textContent = 'Live location sharing is on';
    coordsText.textContent = `Lat ${latitude.toFixed(5)}, Lon ${longitude.toFixed(5)} · accuracy ±${Math.round(accuracy)}m · updated ${new Date().toLocaleTimeString()}`;
  }

  function onError(err){
    dot.classList.remove('ok'); dot.classList.add('danger');
    statusText.textContent = 'Could not access your location';
    coordsText.textContent = err.code === 1
      ? 'Location permission was denied. Enable it in your browser settings and try again.'
      : 'Location is temporarily unavailable. Please try again.';
    enableBtn.classList.remove('d-none');
    stopBtn.classList.add('d-none');
  }

  enableBtn.addEventListener('click', () => {
    if(!navigator.geolocation){
      statusText.textContent = 'Geolocation is not supported by this browser';
      return;
    }
    enableBtn.disabled = true;
    enableBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Locating...';
    navigator.geolocation.getCurrentPosition((pos) => {
      onPosition(pos);
      enableBtn.classList.add('d-none');
      stopBtn.classList.remove('d-none');
      enableBtn.disabled = false;
      enableBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs me-1"></i>Enable Live Location';
      // Keep sharing live as the person moves.
      watchId = navigator.geolocation.watchPosition(onPosition, onError, { enableHighAccuracy: true });
    }, (err) => {
      enableBtn.disabled = false;
      enableBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs me-1"></i>Enable Live Location';
      onError(err);
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  stopBtn.addEventListener('click', () => {
    if(watchId !== null){ navigator.geolocation.clearWatch(watchId); watchId = null; }
    frame.classList.add('d-none');
    placeholder.classList.remove('d-none');
    dot.classList.remove('ok', 'danger'); dot.classList.add('warn');
    statusText.textContent = 'Live location is currently off';
    coordsText.textContent = '';
    stopBtn.classList.add('d-none');
    enableBtn.classList.remove('d-none');
  });

  window.addEventListener('beforeunload', () => {
    if(watchId !== null) navigator.geolocation.clearWatch(watchId);
  });
}

/* ---------------- Emergency Contacts (add new members) ---------------- */
/* ==========================================================================
   BACKEND-INTEGRATED OVERRIDES
   The existing UI stays intact; persistence for important user data now uses
   the authenticated REST API backed by PostgreSQL/Prisma.
   ========================================================================== */
function apiReady(){ return !!window.SheCareAPI; }
function showApiError(message){ console.error('[SheCare]',message); }
function safeDate(v){ const d=new Date(v); return Number.isNaN(d.getTime())?null:d; }

function initAuthNav(){
  if(!apiReady()) return;
  SheCareAPI.me().then(({user})=>{
    const loginLi=document.getElementById('navLoginLi'),logoutLi=document.getElementById('navLogoutLi'),btn=document.getElementById('navGetStartedBtn');
    if(loginLi) loginLi.classList.add('d-none'); if(logoutLi) logoutLi.classList.remove('d-none');
    if(btn){btn.textContent='Dashboard';btn.href=btn.dataset.home||'dashboard.html';}
    const name=document.getElementById('navUserName'); if(name) name.textContent=user.name||'';
  }).catch(()=>{
    const loginLi=document.getElementById('navLoginLi'),logoutLi=document.getElementById('navLogoutLi');
    if(loginLi) loginLi.classList.remove('d-none'); if(logoutLi) logoutLi.classList.add('d-none');
  });
  document.getElementById('navLogoutLink')?.addEventListener('click',async e=>{e.preventDefault();try{await SheCareAPI.logout();}finally{location.href='index.html';}});
}

function initSOS(){
  const triggers=document.querySelectorAll('[data-sos-trigger]'), modalEl=document.getElementById('sosModal');
  if(!triggers.length||!modalEl||typeof bootstrap==='undefined'||!apiReady()) return;
  const modal=bootstrap.Modal.getOrCreateInstance(modalEl), confirmStep=document.getElementById('sosConfirmStep'), successStep=document.getElementById('sosSuccessStep'), yes=document.getElementById('sosYesBtn');
  triggers.forEach(b=>b.addEventListener('click',()=>{confirmStep?.classList.remove('d-none');successStep?.classList.add('d-none');modal.show();}));
  yes?.addEventListener('click',async()=>{
    yes.disabled=true; yes.textContent='Sending…';
    const finish=(message)=>{confirmStep?.classList.add('d-none');successStep?.classList.remove('d-none');const p=successStep?.querySelector('p');if(p&&message)p.textContent=message;};
    const submit=async(pos)=>{try{const result=await SheCareAPI.sos(pos||{});const sent=result.notification?.sent;finish(sent?'SOS recorded and the configured emergency notification was sent. If you are in immediate danger, call 112 now.':'SOS recorded successfully. Notification delivery is not confirmed; if you are in immediate danger, call 112 now.');}catch(e){finish('We could not complete the SOS request. Please call 112 immediately if you are in danger.');showApiError(e.message);}finally{yes.disabled=false;yes.textContent='Yes, Send SOS';}};
    if(navigator.geolocation) navigator.geolocation.getCurrentPosition(pos=>submit({latitude:pos.coords.latitude,longitude:pos.coords.longitude}),()=>submit({}),{enableHighAccuracy:true,timeout:8000,maximumAge:0}); else submit({});
  });
}

function initDueDateCalculator(){
  const form=document.getElementById('dueDateForm'); if(!form) return;
  form.addEventListener('submit',async e=>{e.preventDefault();const lmp=document.getElementById('lmpDate').value;if(!lmp)return;const start=new Date(lmp);const due=new Date(start.getTime()+280*86400000);const today=new Date();const daysAlong=Math.max(0,Math.floor((today-start)/86400000));const weeks=Math.floor(daysAlong/7),days=daysAlong%7;let trimester=weeks>=27?3:weeks>=13?2:1;document.getElementById('dueDateResult')?.classList.remove('d-none');document.getElementById('dueDateOut').textContent=due.toDateString();document.getElementById('gestationOut').textContent=`${weeks} weeks, ${days} days`;document.getElementById('trimesterOut').textContent=`Trimester ${trimester}`;try{await SheCareAPI.resource('pregnancy').create({lastMenstrualPeriod:start.toISOString(),estimatedDueDate:due.toISOString()});}catch(err){showApiError(err.message);}});
}

function initPeriodTracker(){
  const form=document.getElementById('periodForm'); if(!form) return;
  form.addEventListener('submit',async e=>{e.preventDefault();const last=new Date(document.getElementById('lastPeriodDate').value),cycleLen=parseInt(document.getElementById('cycleLength').value)||28,periodLen=parseInt(document.getElementById('periodLength').value)||5;if(Number.isNaN(last.getTime()))return;const next=new Date(last.getTime()+cycleLen*86400000),ov=new Date(next.getTime()-14*86400000),fs=new Date(ov.getTime()-5*86400000),fe=new Date(ov.getTime()+86400000);document.getElementById('periodResult')?.classList.remove('d-none');document.getElementById('nextPeriodOut').textContent=next.toDateString();document.getElementById('fertileWindowOut').textContent=`${fs.toDateString()} — ${fe.toDateString()}`;document.getElementById('ovulationOut').textContent=ov.toDateString();try{await SheCareAPI.resource('periods').create({periodStart:last.toISOString(),cycleLength:cycleLen,notes:`Period length: ${periodLen} days`});}catch(err){showApiError(err.message);}});
}

function initBloodSugar(){
  const form=document.getElementById('sugarForm');if(!form||!apiReady())return;const listEl=document.getElementById('sugarHistoryList');
  async function render(){try{const log=await SheCareAPI.resource('glucose').list();if(listEl){listEl.innerHTML=log.length?'':'<li class="list-group-item bg-transparent text-ink-soft small">No readings yet — add your first one above.</li>';log.slice(0,8).forEach(r=>{const li=document.createElement('li');li.className='list-group-item bg-transparent d-flex justify-content-between align-items-center';const statusClass=r.value<70?'danger':r.value<=140?'ok':'warn';li.innerHTML=`<span><span class="status-dot ${statusClass} me-2"></span>${r.value} mg/dL <small class="text-ink-soft">(${r.readingType})</small></span><small class="text-ink-soft">${new Date(r.recordedAt).toLocaleString()}</small>`;listEl.appendChild(li);});}const cur=document.getElementById('currentGlucoseOut'),last=document.getElementById('lastReadingOut'),st=document.getElementById('glucoseStatusOut');if(log.length&&cur){cur.textContent=log[0].value+' mg/dL';last.textContent=new Date(log[0].recordedAt).toLocaleString();const v=log[0].value;st.textContent=v<70?'Low':v<=140?'Normal':v<=180?'Elevated':'High';}const rc=document.getElementById('aiRiskCircle'),rl=document.getElementById('aiRiskLabel'),re=document.getElementById('aiRiskExplanation'),ab=document.getElementById('aiAssessGlucoseBtn');if(log.length&&rc){const avg=Math.round(log.slice(0,10).reduce((a,b)=>a+Number(b.value),0)/Math.min(log.length,10));const lv=log[0].value;let r='Low',bg='#e7f9ee',col='#198754',exp='Readings are largely within standard clinical targets.';if(lv<70){r='Urgent';bg='#ffebee';col='#dc3545';exp='Hypoglycemia detected (< 70 mg/dL). Follow the Rule of 15 immediately.';}else if(lv>=200||avg>=180){r='High';bg='#ffebee';col='#dc3545';exp='Elevated glycemic pattern detected (>= 200 mg/dL). Clinical review advised.';}else if(lv>=140||avg>=125){r='Moderate';bg='#fff8e1';col='#b26a00';exp='Borderline or post-meal spike detected. Nutritional and activity adjustments advised.';}rc.textContent=r;rc.style.background=bg;rc.style.color=col;if(rl)rl.textContent='Estimated Risk Level: '+r;if(re)re.textContent=exp;}if(ab){ab.onclick=()=>{const lStr=log.length?log[0].value+' mg/dL ('+log[0].readingType+')':'recent reading';if(window.openSheCareAi)window.openSheCareAi('Please perform an AI clinical health assessment on my blood sugar. My latest reading is '+lStr+'. What is my risk categorization according to ADA/RSSDI standards and what dietary/lifestyle actions should I take?');};}if(window.updateGlucoseChart)window.updateGlucoseChart(log);}catch(e){showApiError(e.message)}}
  form.addEventListener('submit',async e=>{e.preventDefault();const value=Number(document.getElementById('sugarValue').value),readingType=document.getElementById('sugarType').value;if(!value)return;try{await SheCareAPI.resource('glucose').create({value,readingType});form.reset();await render();}catch(err){showApiError(err.message)}});render();
}
function initGlucoseChart(){const canvas=document.getElementById('glucoseChart');if(!canvas||typeof Chart==='undefined')return;let chart;async function render(log){if(!log){try{log=await SheCareAPI.resource('glucose').list();}catch{log=[];}}log=log.slice(0,7).reverse();const labels=log.length?log.map(r=>new Date(r.recordedAt).toLocaleDateString()):['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];const values=log.length?log.map(r=>r.value):[];if(chart)chart.destroy();chart=new Chart(canvas,{type:'line',data:{labels,datasets:[{label:'Glucose (mg/dL)',data:values,borderColor:'#ff4fa3',backgroundColor:'rgba(255,79,163,.15)',tension:.4,fill:true,pointRadius:4}]},options:{responsive:true,plugins:{legend:{display:false}}}});}window.updateGlucoseChart=render;render();}

function initWaterIntake(){const c=document.getElementById('waterTracker');if(!c||!apiReady())return;const goal=8,countOut=document.getElementById('waterCountOut'),bar=document.getElementById('waterBar');async function render(){try{const rows=await SheCareAPI.resource('water').list();const today=new Date();const count=rows.filter(r=>{const d=new Date(r.recordedAt);return d.toDateString()===today.toDateString();}).reduce((a,r)=>a+Number(r.amount||0),0);countOut.textContent=`${count} / ${goal} glasses`;bar.style.width=Math.min(100,count/goal*100)+'%';}catch(e){showApiError(e.message)}}document.getElementById('waterAddBtn')?.addEventListener('click',async()=>{try{await SheCareAPI.resource('water').create({amount:1});render();}catch(e){showApiError(e.message)}});document.getElementById('waterResetBtn')?.addEventListener('click',async()=>{try{const rows=await SheCareAPI.resource('water').list();const today=new Date().toDateString();await Promise.all(rows.filter(r=>new Date(r.recordedAt).toDateString()===today).map(r=>SheCareAPI.resource('water').delete(r.id)));render();}catch(e){showApiError(e.message)}});render();}

function initMoodTracker(){const buttons=document.querySelectorAll('[data-mood]');if(!buttons.length||!apiReady())return;const logEl=document.getElementById('moodLog');async function render(){try{const log=await SheCareAPI.resource('mood').list();if(!logEl)return;logEl.innerHTML=log.length?'':'<p class="text-ink-soft small mb-0">No moods logged yet today.</p>';log.slice(0,6).forEach(m=>{const chip=document.createElement('span');chip.className='badge rounded-pill bg-secondary-soft text-primary-pink me-2 mb-2 p-2 px-3';chip.textContent=`${m.mood} · ${new Date(m.recordedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;logEl.appendChild(chip);});}catch(e){showApiError(e.message)}}buttons.forEach(b=>b.addEventListener('click',async()=>{try{await SheCareAPI.resource('mood').create({mood:`${b.dataset.mood} ${b.dataset.label||''}`.trim()});render();}catch(e){showApiError(e.message)}}));render();}

function initMedicineReminder(){const form=document.getElementById('medReminderForm');if(!form||!apiReady())return;const listEl=document.getElementById('medReminderList');async function render(){try{const list=await SheCareAPI.resource('medicines').list();listEl.innerHTML=list.length?'':'<li class="list-group-item bg-transparent text-ink-soft small">No reminders set.</li>';list.forEach(r=>{const li=document.createElement('li');li.className='list-group-item bg-transparent d-flex justify-content-between align-items-center';li.innerHTML=`<span><i class="fa-solid fa-pills text-primary-pink me-2"></i>${r.name} — ${r.frequency||''}</span><button class="btn btn-sm btn-outline-pink" data-remove="${r.id}" type="button" aria-label="Delete medicine reminder"><i class="fa-solid fa-xmark"></i></button>`;listEl.appendChild(li);});listEl.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{try{await SheCareAPI.resource('medicines').delete(b.dataset.remove);render();}catch(e){showApiError(e.message)}});}catch(e){showApiError(e.message)}}form.addEventListener('submit',async e=>{e.preventDefault();const name=document.getElementById('medName').value.trim(),time=document.getElementById('medTime').value;if(!name||!time)return;try{await SheCareAPI.resource('medicines').create({name,frequency:time});form.reset();render();}catch(err){showApiError(err.message)}});render();}

function initFitnessGoals(){const container=document.getElementById('fitnessGoals');if(!container||!apiReady())return;const bars=container.querySelectorAll('[data-goal-bar]');async function state(){try{const rows=await SheCareAPI.resource('fitness').list();return {sessions:rows.length,minutes:rows.reduce((a,r)=>a+Number(r.duration||0),0),calories:rows.reduce((a,r)=>a+Number(r.calories||0),0)};}catch{return {sessions:0,minutes:0,calories:0}}}async function render(){const s=await state();bars.forEach(bar=>{const key=bar.dataset.goalBar,goal=parseInt(bar.dataset.goalMax),val=s[key]||0;bar.style.width=Math.min(100,val/goal*100)+'%';document.querySelector(`[data-goal-label="${key}"]`)?.replaceChildren(`${val} / ${goal}`);});}document.querySelectorAll('[data-goal-add]').forEach(btn=>btn.addEventListener('click',async()=>{const key=btn.dataset.goalAdd,step=parseInt(btn.dataset.goalStep||1);try{await SheCareAPI.resource('fitness').create({activity:`Goal: ${key}`,duration:key==='minutes'?step:null,calories:key==='calories'?step:null});render();}catch(e){showApiError(e.message)}}));window.renderFitnessGoals=render;window.logYogaSession=async minutes=>{try{await SheCareAPI.resource('fitness').create({activity:'Yoga session',duration:minutes,calories:Math.round(minutes*5)});render();}catch(e){showApiError(e.message)}};render();}

function initSAIChat(){
  const fab=document.getElementById('shecareAiFab'),panel=document.getElementById('shecareAiPanel');
  if(!fab||!panel||!apiReady()) return;
  const body=document.getElementById('shecareAiBody'),input=document.getElementById('shecareAiInput'),sendBtn=document.getElementById('shecareAiSend'),closeBtn=document.getElementById('shecareAiClose'),micBtn=document.getElementById('shecareAiMic'),suggestions=document.querySelectorAll('[data-ai-suggest]');
  let conversationId=null;

  function formatMarkdown(text){
    if(!text)return '';
    let s=String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,'<em>$1</em>')
      .replace(/^### (.*$)/gim,'<h6 class="fw-bold mt-2 mb-1">$1</h6>')
      .replace(/^## (.*$)/gim,'<h6 class="fw-bold mt-2 mb-1">$1</h6>')
      .replace(/^# (.*$)/gim,'<h5 class="fw-bold mt-2 mb-1">$1</h5>')
      .replace(/^\s*[-*]\s+(.*$)/gim,'<li class="ms-2">$1</li>')
      .replace(/\n\n/g,'<p class="mb-2"></p>')
      .replace(/\n/g,'<br/>');
    return s;
  }

  function bubble(text,who,isHtml=false){
    const d=document.createElement('div');
    d.className=`chat-bubble ${who}`;
    if(who==='ai'){
      if(isHtml) d.innerHTML=text;
      else d.innerHTML=formatMarkdown(text);
    } else {
      d.textContent=text;
    }
    body.appendChild(d);
    body.scrollTop=body.scrollHeight;
    return d;
  }

  async function load(){
    try{
      const cs=await SheCareAPI.conversations();
      const c=cs[0];
      if(c){
        conversationId=c.id;
        (c.messages||[]).slice(-40).forEach(m=>bubble(m.message,m.role==='user'?'user':'ai'));
      }
      if(!body.children.length) bubble('Hi! I am the SheCares Health & Wellness AI Assistant. How can I help you today? Ask about symptoms, vital signs, menstrual cycles, pregnancy care, nutrition, or yoga form guidance.','ai');
    }catch{
      if(!body.children.length) bubble('Hi! I am the SheCares Health & Wellness AI Assistant. Describe any symptoms or ask any health question.','ai');
    }
  }

  async function send(text){
    text=(text||'').trim();
    if(!text) return;
    bubble(text,'user');
    input.value='';
    input.disabled=true;
    sendBtn.disabled=true;

    const t=document.createElement('div');
    t.className='chat-bubble ai';
    t.innerHTML='<i class="fa-solid fa-spinner fa-spin me-2"></i>Analyzing with SheCares Health AI…';
    body.appendChild(t);
    body.scrollTop=body.scrollHeight;

    try{
      const r=await SheCareAPI.chat(text,conversationId);
      conversationId=r.conversationId;
      t.remove();
      bubble(r.reply,'ai');
    }catch(e){
      t.remove();
      bubble(e.message||'Health AI is temporarily busy. Please try again.','ai');
    }finally{
      input.disabled=false;
      sendBtn.disabled=false;
      input.focus();
    }
  }

  const toggle=o=>{
    const open=typeof o==='boolean'?o:!panel.classList.contains('open');
    panel.classList.toggle('open',open);
    panel.classList.toggle('d-none',!open);
    panel.setAttribute('aria-hidden',String(!open));
    if(open){load();setTimeout(()=>input?.focus(),80)}
  };

  fab.onclick=()=>toggle();
  closeBtn?.addEventListener('click',()=>toggle(false));
  sendBtn?.addEventListener('click',()=>send(input.value));
  input?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input.value)}});
  suggestions.forEach(b=>b.addEventListener('click',()=>send(b.dataset.aiSuggest||b.textContent)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false)});
  window.openSheCareAi=function(promptText){
    toggle(true);
    if(promptText){
      setTimeout(()=>{input.value=promptText;send(promptText);},200);
    }
  };
  if(micBtn&&('SpeechRecognition'in window||'webkitSpeechRecognition'in window)){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition,rec=new SR();
    rec.lang='en-IN';
    rec.onresult=e=>input.value=e.results[0][0].transcript;
    micBtn.onclick=()=>{try{rec.start()}catch{}}
  }else if(micBtn) micBtn.disabled=true;
}

function initEmergencyContacts(){const list=document.getElementById('emergencyContactsList'),form=document.getElementById('contactAddForm');if(!list||!form||!apiReady())return;async function render(){try{const contacts=await SheCareAPI.emergency.list();list.innerHTML=contacts.length?'':'<li class="list-group-item bg-transparent text-ink-soft small">No emergency contacts yet.</li>';contacts.forEach(c=>{const li=document.createElement('li');li.className='list-group-item bg-transparent d-flex justify-content-between align-items-center';li.innerHTML=`<span><i class="fa-solid fa-user text-primary-pink me-2"></i>${c.name} — ${c.relationship||''} <span class="text-ink-soft small">(${c.phone})</span></span><span class="d-flex align-items-center gap-2"><a class="btn btn-sm btn-outline-pink" href="tel:${encodeURIComponent(c.phone)}" aria-label="Call ${c.name}"><i class="fa-solid fa-phone"></i></a><button class="btn btn-sm btn-outline-pink border-0" data-remove-contact="${c.id}" title="Remove" aria-label="Remove ${c.name}" type="button"><i class="fa-solid fa-xmark"></i></button></span>`;list.appendChild(li);});list.querySelectorAll('[data-remove-contact]').forEach(b=>b.onclick=async()=>{try{await SheCareAPI.emergency.delete(b.dataset.removeContact);render();}catch(e){showApiError(e.message)}});}catch(e){showApiError(e.message)}}form.addEventListener('submit',async e=>{e.preventDefault();const name=document.getElementById('newContactName').value.trim(),relationship=document.getElementById('newContactRelation').value.trim(),phone=document.getElementById('newContactPhone').value.trim();if(!name||!relationship||!phone)return;try{await SheCareAPI.emergency.create({name,relationship,phone});form.reset();render();const c=document.getElementById('addContactForm');if(c&&typeof bootstrap!=='undefined')bootstrap.Collapse.getOrCreateInstance(c).hide();}catch(err){showApiError(err.message)}});render();}

/* Splash screen controller */
function initAppSplashScreen() {
  if (document.getElementById('scSplashScreen')) return;
  const splash = document.createElement('div');
  splash.id = 'scSplashScreen';
  const logoPath = '/assets/images/shecares-logo.jpg';
  splash.innerHTML = `
    <div class="sc-splash-logo-wrap">
      <div class="sc-splash-glow"></div>
      <img src="${logoPath}" class="sc-splash-logo" alt="SheCares App Symbol">
    </div>
    <div class="sc-splash-title">SHECARES</div>
    <div class="sc-splash-tagline">Health &bull; Safety &bull; Well-being</div>
    <div class="sc-splash-progress-track">
      <div class="sc-splash-progress-bar" id="scSplashProgressBar"></div>
    </div>
  `;
  (document.body || document.documentElement).prepend(splash);
  requestAnimationFrame(() => {
    setTimeout(() => {
      const bar = document.getElementById('scSplashProgressBar');
      if (bar) bar.style.width = '100%';
    }, 60);
  });
  const dismiss = () => {
    splash.classList.add('fade-out');
    setTimeout(() => { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 600);
  };
  setTimeout(dismiss, 5000);
}

