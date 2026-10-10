/* ==========================================================================
   SHECARES — App Opening Splash Screen Controller
   Displays the official SheCares logo symbol for at least 5 seconds when the app starts
   ========================================================================== */
(function initAppSplashScreen() {
  if (document.getElementById('scSplashScreen')) {
    return;
  }

  // Create splash screen element
  const splash = document.createElement('div');
  splash.id = 'scSplashScreen';

  const logoPath = '/assets/images/shecares-logo.jpg';

  splash.innerHTML = `
    <div class="sc-splash-logo-wrap">
      <div class="sc-splash-glow"></div>
      <img src="${logoPath}" class="sc-splash-logo" alt="SheCares Logo Symbol">
    </div>
    <div class="sc-splash-title">SHECARES</div>
    <div class="sc-splash-tagline">Health &bull; Safety &bull; Well-being</div>
    <div class="sc-splash-progress-track">
      <div class="sc-splash-progress-bar" id="scSplashProgressBar"></div>
    </div>
  `;

  // Attach immediately to document body or root element
  const mount = () => {
    if (document.getElementById('scSplashScreen')) return;
    if (document.body) {
      document.body.prepend(splash);
    } else if (document.documentElement) {
      document.documentElement.appendChild(splash);
    }

    // Trigger smooth 5-second progress bar fill
    requestAnimationFrame(() => {
      setTimeout(() => {
        const bar = document.getElementById('scSplashProgressBar');
        if (bar) bar.style.width = '100%';
      }, 60);
    });
  };

  if (document.body || document.documentElement) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }

  // Keep the splash screen for at least 5 full seconds (5000ms)
  const SPLASH_MIN_DURATION_MS = 5000;
  const dismiss = () => {
    splash.classList.add('fade-out');
    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, 600);
  };

  setTimeout(dismiss, SPLASH_MIN_DURATION_MS);
})();
