/* SHECARES — Central Loop-Immune Auth Router */
(function initAuthRouter() {
  const path = window.location.pathname.toLowerCase();
  const isLoginPage = path.includes('login');
  const isDashboardPage = path.includes('dashboard');
  const isIndexPage = path === '/' || path.endsWith('/index.html') || path.endsWith('/index');

  const token = localStorage.getItem('sc_token');

  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Login Page handling:
    // Stays on login page cleanly if unauthenticated. If authenticated, proceeds to dashboard.
    if (isLoginPage) {
      if (token && window.SheCareAPI) {
        try {
          await SheCareAPI.me();
          if (!isDashboardPage) window.location.href = '/dashboard.html';
        } catch (err) {
          localStorage.removeItem('sc_token');
        }
      }
      return;
    }

    // 2. Index / Root Page handling:
    // If authenticated, proceeds to dashboard.
    if (isIndexPage) {
      if (token && window.SheCareAPI) {
        try {
          await SheCareAPI.me();
          if (!isDashboardPage) window.location.href = '/dashboard.html';
        } catch (err) {
          localStorage.removeItem('sc_token');
        }
      }
      return;
    }

    // 3. Protected Pages handling:
    // If missing token or 401 unauthenticated, redirect to login page.
    if (!token) {
      if (!isLoginPage) window.location.href = '/login.html';
      return;
    }

    if (window.SheCareAPI) {
      try {
        await SheCareAPI.me();
      } catch (err) {
        if (err.status === 401) {
          localStorage.removeItem('sc_token');
          if (!isLoginPage) window.location.href = '/login.html';
        }
      }
    }
  });
})();
