/* ==========================================================================
   SHECARES — App Opening Splash Screen Controller
   Displays the official SheCares logo symbol ONLY when the app opens freshly
   ========================================================================== */
(function initAppSplashScreen() {
  // Only show splash screen once per fresh session opening
  if (sessionStorage.getItem('sc_splash_shown') === 'true' || document.getElementById('scSplashScreen')) {
    return;
  }
  sessionStorage.setItem('sc_splash_shown', 'true');

  // Create splash screen element
  const splash = document.createElement('div');
  splash.id = 'scSplashScreen';

  const isPagesSubdir = window.location.pathname.includes('/pages/');
  const logoPath = isPagesSubdir ? '/assets/images/shecares-logo.jpg' : '/assets/images/shecares-logo.jpg';

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
    if (document.body) {
      document.body.appendChild(splash);
    } else if (document.documentElement) {
      document.documentElement.appendChild(splash);
    }

    // Trigger smooth progress bar fill
    requestAnimationFrame(() => {
      setTimeout(() => {
        const bar = document.getElementById('scSplashProgressBar');
        if (bar) bar.style.width = '100%';
      }, 40);
    });
  };

  if (document.body || document.documentElement) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }

  // Dismiss splash screen smoothly
  const dismiss = () => {
    splash.classList.add('fade-out');
    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, 550);
  };

  if (document.readyState === 'complete') {
    setTimeout(dismiss, 750);
  } else {
    window.addEventListener('load', () => setTimeout(dismiss, 550));
    setTimeout(dismiss, 1200); // Safety fallback timeout
  }
})();
