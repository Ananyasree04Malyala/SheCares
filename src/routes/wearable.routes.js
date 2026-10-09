/**
 * SheCare Wearables API Routes
 * Secure routes mounted at /api/wearables
 * Implements rate limiting and authentication checks
 */

'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { authRequired, authOptional } = require('../middleware/auth');
const wc = require('../controllers/wearable.controller');

// Rate limiter for sync endpoints to prevent mobile battery/server drain
const syncLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // maximum 30 sync requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many wearable synchronization requests. Please wait a moment.'
  }
});

// 1. Providers and Capabilities
router.get('/providers', wc.getProviders);

// 2. Status & Connections
router.get('/status', authOptional, wc.getStatus);
router.post('/connect', authOptional, wc.connect);
router.post('/disconnect', authOptional, wc.disconnect);
router.post('/revoke', authOptional, wc.revoke);

// 3. Synchronization
router.post('/sync', authOptional, syncLimiter, wc.sync);
router.post('/demo/generate', authOptional, wc.generateDemoData);

// 4. Data Access (Latest, History, Aggregates)
router.get('/latest', authOptional, wc.getLatest);
router.get('/history', authOptional, wc.getHistory);
router.get('/daily-summary', authOptional, wc.getDailySummary);

// 5. Clinical Alerts
router.get('/alerts', authOptional, wc.getAlerts);
router.post('/alerts/:id/dismiss', authOptional, wc.dismissAlert);

module.exports = router;
