const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { fail } = require('../utils/api');

function signUser(userId) { return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' }); }
function setAuthCookie(res, token) {
  res.cookie('shecare_session', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}
function clearAuthCookie(res) { res.clearCookie('shecare_session', { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SECURE ? 'none' : 'lax', path: '/' }); }
function authRequired(req, res, next) {
  let token = req.cookies?.shecare_session;
  if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return fail(res, 401, 'Authentication required. Please log in.');
  try { const payload = jwt.verify(token, env.JWT_SECRET); req.userId = payload.sub; next(); }
  catch { return fail(res, 401, 'Your session has expired. Please log in again.'); }
}
function authOptional(req, res, next) {
  let token = req.cookies?.shecare_session;
  if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.userId = payload.sub;
  } catch {}
  next();
}
module.exports = { signUser, setAuthCookie, clearAuthCookie, authRequired, authOptional };
