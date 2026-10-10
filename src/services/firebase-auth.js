const env = require('../config/env');

const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

async function verifyIdToken(idToken) {
  if (!env.FIREBASE_API_KEY) throw new Error('FIREBASE_AUTH_NOT_CONFIGURED');
  if (typeof idToken !== 'string' || idToken.length < 100 || idToken.length > 10000) {
    throw new Error('INVALID_FIREBASE_TOKEN');
  }

  const response = await fetch(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });

  let data = {};
  try { data = await response.json(); } catch {}

  if (!response.ok || !data.users || !data.users[0]) {
    throw new Error('INVALID_FIREBASE_TOKEN');
  }

  const user = data.users[0];

  return {
    localId: user.localId,
    phoneNumber: user.phoneNumber || null,
    email: user.email || null,
    displayName: user.displayName || null,
    photoUrl: user.photoUrl || null
  };
}

module.exports = { verifyIdToken };
