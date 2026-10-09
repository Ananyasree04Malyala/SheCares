/* SHECARES — Central Loop-Immune Auth Router */
(function initAuthRouter() {
  const path = window.location.pathname.toLowerCase();
  const isLoginPage = path.includes('login');
  const isDashboardPage = path.includes('dashboard');
  const isIndexPage = path === '/' || path.endsWith('/index.html') || path.endsWith('/index') || path.endsWith('/');

  const token = localStorage.getItem('sc_token');

  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Root / Index page handling: launch directly to login if unauthenticated
    if (isIndexPage) {
      if (!token) {
        if (!isLoginPage) window.location.href = '/login.html';
        return;
      }
      try {
        if (window.SheCareAPI) await SheCareAPI.me();
        if (!isDashboardPage) window.location.href = '/dashboard.html';
      } catch (err) {
        localStorage.removeItem('sc_token');
        if (!isLoginPage) window.location.href = '/login.html';
      }
      return;
    }

    // 2. Login page handling: if user is already authenticated, move to dashboard
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

    // 3. Protected pages handling: enforce login prompt if token is missing or expired
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
