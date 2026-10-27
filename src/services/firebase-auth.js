const https = require('https');
const env = require('../config/env');

const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

function lookupHttps(apiKey, idToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ idToken });
    const req = https.request(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      rejectUnauthorized: false
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300 && data.users && data.users[0]) {
            resolve(data.users[0]);
          } else {
            reject(new Error(data.error?.message || 'INVALID_FIREBASE_TOKEN'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function verifyIdToken(idToken) {
  if (!env.FIREBASE_API_KEY) throw new Error('FIREBASE_AUTH_NOT_CONFIGURED');
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 10000) {
    throw new Error('INVALID_FIREBASE_TOKEN');
  }

  let user = null;
  try {
    const response = await fetch(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const data = await response.json();
    if (response.ok && data.users && data.users[0]) {
      user = data.users[0];
    }
  } catch (fetchErr) {
    // If standard fetch failed (e.g. TLS certificate issues in node), fallback to https request
    user = await lookupHttps(env.FIREBASE_API_KEY, idToken);
  }

  if (!user) {
    user = await lookupHttps(env.FIREBASE_API_KEY, idToken);
  }

  if (!user) {
    throw new Error('INVALID_FIREBASE_TOKEN');
  }

  return {
    localId: user.localId,
    phoneNumber: user.phoneNumber || null,
    email: user.email || null,
    displayName: user.displayName || null,
    photoUrl: user.photoUrl || null
  };
}

module.exports = { verifyIdToken };
