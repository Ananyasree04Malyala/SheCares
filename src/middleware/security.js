const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// The existing SheCare frontend uses Bootstrap/CDN assets and inline UI scripts/styles.
// Keep the CSP compatible with the existing UI while still blocking unsafe object/base/frame use.
const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://www.gstatic.com', 'https://www.google.com', 'https://www.recaptcha.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'blob:', 'data:', 'https://cdn.jsdelivr.net', 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://www.googleapis.com', 'https://www.google.com', 'https://www.recaptcha.net', 'https://nominatim.openstreetmap.org', 'https://*.tile.openstreetmap.org', 'https://tile.openstreetmap.org', 'https://*.basemaps.cartocdn.com', 'https://basemaps.cartocdn.com'],
      workerSrc: ["'self'", 'blob:'],
      mediaSrc: ["'self'", 'blob:', 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
      frameSrc: ["'self'", 'https://maps.google.com', 'https://www.google.com', 'https://*.google.com', 'https://www.google.com/recaptcha/', 'https://www.recaptcha.net/recaptcha/']
    }
  }
});
const corsMiddleware = cors({ origin: true, credentials: true });
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/smartwatch') || (req.originalUrl && req.originalUrl.includes('/smartwatch'))
});
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many authentication attempts. Please try again later.' } });
module.exports = { helmetMiddleware, corsMiddleware, apiLimiter, authLimiter };
