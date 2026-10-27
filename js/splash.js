/* ==========================================================================
   SHECARES — App Opening Splash & Feature Transition Controller
   - On 1st time app start: Logo displays for 5 seconds.
   - On feature switch (navigation): Logo displays for 3 seconds.
   ========================================================================== */
(function initAppSplashScreen() {
  if (document.getElementById('scSplashScreen')) {
    return;
  }

  const isFirstLaunch = !sessionStorage.getItem('sc_app_started');
  sessionStorage.setItem('sc_app_started', 'true');

  const lastPage = sessionStorage.getItem('sc_last_page');
  const currentPage = window.location.pathname;
  sessionStorage.setItem('sc_last_page', currentPage);

  // Skip redundant splash screen on same-page refreshes or form submissions
  if (lastPage === currentPage && !isFirstLaunch) {
    return;
  }

  const splashDurationMs = isFirstLaunch ? 5000 : 3000;
  const progressDurationSec = isFirstLaunch ? '4.8s' : '2.8s';

  // Create splash screen element
  const splash = document.createElement('div');
  splash.id = 'scSplashScreen';

  const logoPath = '/assets/images/shecares-logo.jpg';
  const taglineText = isFirstLaunch 
    ? 'Health &bull; Safety &bull; Well-being'
    : 'Loading Feature...';

  splash.innerHTML = `
    <div class="sc-splash-logo-wrap">
      <div class="sc-splash-glow"></div>
      <img src="${logoPath}" class="sc-splash-logo" alt="SheCares Logo Symbol">
    </div>
    <div class="sc-splash-title">SHECARES</div>
    <div class="sc-splash-tagline">${taglineText}</div>
    <div class="sc-splash-progress-track">
      <div class="sc-splash-progress-bar" id="scSplashProgressBar" style="transition: width ${progressDurationSec} cubic-bezier(0.25, 1, 0.5, 1);"></div>
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

    // Trigger smooth progress bar fill
    requestAnimationFrame(() => {
      setTimeout(() => {
        const bar = document.getElementById('scSplashProgressBar');
        if (bar) bar.style.width = '100%';
      }, 50);
    });
  };

  if (document.body || document.documentElement) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }

  let dismissed = false;
  // Dismiss splash screen smoothly after duration
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    splash.classList.add('fade-out');
    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, 450);
  };

  // Instant tap-to-continue so user is never blocked if in a hurry
  splash.addEventListener('click', dismiss);
  splash.addEventListener('touchstart', dismiss, { passive: true });

  setTimeout(dismiss, splashDurationMs);
})();
