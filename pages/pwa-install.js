/**
 * SHECARES PWA Mobile App Installer & Registration Engine
 */
(function() {
  'use strict';

  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.log('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  // 2. Handle Deferred Install Prompt
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar on mobile Chrome
    e.preventDefault();
    deferredPrompt = e;
    showPwaInstallBanner();
  });

  function showPwaInstallBanner() {
    if (document.getElementById('pwaInstallBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.className = 'fixed-bottom p-3 bg-white border-top shadow-lg d-flex align-items-center justify-content-between flex-wrap gap-2';
    banner.style.zIndex = '9999';
    banner.style.borderRadius = '20px 20px 0 0';

    banner.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <img src="/assets/images/shecares-logo.jpg" alt="SHECARES App Icon" class="rounded-3 shadow-xs" style="width: 44px; height: 44px; object-fit: cover;">
        <div>
          <strong class="d-block text-ink fs-6" style="line-height:1.2;">Install SHECARES App</strong>
          <small class="text-ink-soft" style="font-size:0.75rem;">Open directly on your phone home screen like a native app</small>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary px-3" id="btnDismissPwaBanner">Later</button>
        <button class="btn btn-sm btn-pink fw-semibold px-3 shadow-sm ripple" id="btnInstallPwaApp">
          <i class="fa-solid fa-download me-1"></i>Install App
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('btnInstallPwaApp')?.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      console.log('[PWA] User response to install prompt:', choice.outcome);
      deferredPrompt = null;
      banner.remove();
    });

    document.getElementById('btnDismissPwaBanner')?.addEventListener('click', () => {
      banner.remove();
      sessionStorage.setItem('shecares_pwa_dismissed', 'true');
    });
  }

  // 3. iOS Detection Helper for "Add to Home Screen"
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

  if (isIOS && !isStandalone && !sessionStorage.getItem('shecares_ios_pwa_dismissed')) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        showIosPwaBanner();
      }, 3000);
    });
  }

  function showIosPwaBanner() {
    if (document.getElementById('iosPwaBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'iosPwaBanner';
    banner.className = 'fixed-bottom p-3 bg-white border-top shadow-lg text-center';
    banner.style.zIndex = '9999';
    banner.style.borderRadius = '20px 20px 0 0';

    banner.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div class="d-flex align-items-center gap-2">
          <img src="/assets/images/shecares-logo.jpg" alt="SHECARES App Icon" class="rounded-2" style="width: 32px; height: 32px; object-fit: cover;">
          <strong class="text-ink small">Install SHECARES on iPhone</strong>
        </div>
        <button type="button" class="btn-close btn-close-xs" id="btnCloseIosPwaBanner"></button>
      </div>
      <p class="small text-ink-soft mb-1" style="font-size:0.8rem;">
        To open directly as a mobile app: tap <i class="fa-solid fa-arrow-up-from-bracket text-primary"></i> <strong>Share</strong> and select <strong>"Add to Home Screen"</strong>.
      </p>
    `;

    document.body.appendChild(banner);

    document.getElementById('btnCloseIosPwaBanner')?.addEventListener('click', () => {
      banner.remove();
      sessionStorage.setItem('shecares_ios_pwa_dismissed', 'true');
    });
  }

})();
