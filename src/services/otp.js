const crypto = require('crypto');

const prisma = require('../config/db');
const env = require('../config/env');
const { sendMail } = require('./email');

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizePhone(value) {
  const raw = String(value || '').trim().replace(/[()\s-]/g, '');
  if (/^\d{10}$/.test(raw)) return `+91${raw}`;
  if (/^91\d{10}$/.test(raw)) return `+${raw}`;
  if (/^\+\d{10,15}$/.test(raw)) return raw;
  throw new Error('Enter a valid phone number with country code, e.g. +919876543210.');
}

function getPhoneVariants(value) {
  const raw = String(value || '').trim().replace(/[()\s-]/g, '');
  const variants = new Set();
  if (!raw) return [];
  variants.add(raw);
  if (/^\d{10}$/.test(raw)) {
    variants.add(`+91${raw}`);
    variants.add(`91${raw}`);
  } else if (/^\+91\d{10}$/.test(raw)) {
    const tenDigits = raw.slice(3);
    variants.add(tenDigits);
    variants.add(`91${tenDigits}`);
  } else if (/^91\d{10}$/.test(raw)) {
    const tenDigits = raw.slice(2);
    variants.add(tenDigits);
    variants.add(`+91${tenDigits}`);
  }
  return Array.from(variants);
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code).trim()).digest('hex');
}

function makeCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendEmailOtp(email, name, emailOtp) {
  const result = await sendMail({
    to: email,
    subject: 'SHECARES email verification code',
    text: `Hello ${name || 'there'},\n\nYour SHECARES email verification code is: ${emailOtp}\n\nThis code expires in 10 minutes. Never share it with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;padding:20px;border:1px solid #f3d4e1;border-radius:12px;">
        <h2 style="color:#e83e83;margin-top:0;">SHECARES Verification</h2>
        <p>Hello ${name || 'there'},</p>
        <p>Thank you for signing up with SHECARES. Here is your email verification code:</p>
        <div style="margin-top:12px;padding:12px;background:#f8f9fa;border-radius:8px;">
          <p style="margin:0;font-size:14px;color:#333;font-weight:600;">Email Verification Code:</p>
          <p style="margin:4px 0 0;font-size:32px;font-weight:700;letter-spacing:6px;color:#e83e83;">${emailOtp}</p>
        </div>
        <p style="margin-top:20px;font-size:13px;color:#777;">This code expires in 10 minutes. Never share it with anyone.</p>
      </div>`
  });
  return result;
}

const memoryOtpStore = new Map();
const memoryPendingSignups = new Map();

// Regularly clean up expired in-memory entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memoryOtpStore.entries()) {
      if (v.expiresAt <= now) memoryOtpStore.delete(k);
    }
    for (const [k, v] of memoryPendingSignups.entries()) {
      if (v.expiresAt && v.expiresAt.getTime() <= now) memoryPendingSignups.delete(k);
    }
  }, 60000).unref?.();
}

async function getPendingSignup(id) {
  if (!id) return null;
  try {
    const record = await prisma.pendingSignup.findUnique({ where: { id } });
    if (record) return record;
  } catch (err) {
    console.warn('[OTP] Database read for pendingSignup note:', err.message);
  }
  return memoryPendingSignups.get(id) || null;
}

async function updatePendingSignup(id, data) {
  if (!id) return null;
  let record = null;
  try {
    record = await prisma.pendingSignup.update({
      where: { id },
      data
    });
  } catch (err) {
    console.warn('[OTP] Database update for pendingSignup note:', err.message);
  }
  const mem = memoryPendingSignups.get(id);
  if (mem) {
    if (data.attempts?.increment) {
      mem.attempts = (mem.attempts || 0) + data.attempts.increment;
    } else {
      Object.assign(mem, data);
    }
    return mem;
  }
  return record;
}

async function deletePendingSignup(id) {
  if (!id) return;
  try {
    await prisma.pendingSignup.delete({ where: { id } }).catch(() => {});
  } catch {}
  memoryPendingSignups.delete(id);
}

async function createPendingSignup({ name, email, phone, passwordHash }) {
  const emailOtp = makeCode();
  const phoneOtp = makeCode();
  const now = Date.now();
  const cleanPhone = phone ? String(phone).trim() : '';
  const phoneVariants = cleanPhone ? getPhoneVariants(cleanPhone) : [];
  const expiresAt = new Date(now + OTP_TTL_MS);

  let pending = null;
  try {
    await prisma.pendingSignup.deleteMany({
      where: {
        OR: [
          { email },
          ...(phoneVariants.length > 0 ? [{ phone: { in: phoneVariants } }] : [])
        ]
      }
    });

    pending = await prisma.pendingSignup.create({
      data: {
        name,
        email,
        phone: cleanPhone,
        passwordHash,
        emailOtpHash: hashCode(emailOtp),
        emailOtpExpires: expiresAt,
        phoneOtpHash: hashCode(phoneOtp),
        phoneOtpExpires: expiresAt,
        phoneVerified: true, // Auto-verified: ONLY email OTP verification is required
        emailVerified: false,
        expiresAt
      }
    });
  } catch (dbErr) {
    console.warn('[OTP] Database unavailable for pendingSignup, using memory store:', dbErr.message);
    const id = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    pending = {
      id,
      name,
      email,
      phone: cleanPhone,
      passwordHash,
      emailOtpHash: hashCode(emailOtp),
      emailOtpExpires: expiresAt,
      phoneOtpHash: hashCode(phoneOtp),
      phoneOtpExpires: expiresAt,
      phoneVerified: true,
      emailVerified: false,
      expiresAt,
      attempts: 0
    };
  }

  // Always store in memory as well for zero-downtime reliability
  memoryPendingSignups.set(pending.id, pending);

  return { pending, emailOtp, phoneOtp };
}

async function createLoginOtp({ email, phone }) {
  const code = makeCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const identifiers = new Set();
  if (email) identifiers.add(String(email).trim().toLowerCase());
  if (phone) {
    getPhoneVariants(phone).forEach(v => identifiers.add(v));
  }
  const idArray = Array.from(identifiers);
  const primaryKey = email ? String(email).trim().toLowerCase() : (phone || '');

  // Always store in memory store as fallback
  for (const id of idArray) {
    memoryOtpStore.set(id, { codeHash, expiresAt: expiresAt.getTime() });
  }

  let record = null;
  try {
    await prisma.loginOtp.deleteMany({
      where: { phone: { in: idArray } }
    });

    record = await prisma.loginOtp.create({
      data: {
        phone: primaryKey,
        codeHash,
        expiresAt
      }
    });
  } catch (err) {
    console.warn('[OTP] Database unavailable for loginOtp create, using memory store:', err.message);
    record = {
      id: `mem_${Date.now()}`,
      phone: primaryKey,
      codeHash,
      expiresAt
    };
  }

  return { loginOtp: record, code };
}

async function verifyLoginOtp({ email, phone, code }) {
  const identifiers = new Set();
  if (email) identifiers.add(String(email).trim().toLowerCase());
  if (phone) {
    getPhoneVariants(phone).forEach(v => identifiers.add(v));
  }
  const idArray = Array.from(identifiers);
  const targetHash = hashCode(code);

  // 1. Try Database lookup
  let dbMatch = false;
  try {
    const records = await prisma.loginOtp.findMany({
      where: {
        phone: { in: idArray },
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    const match = records.find(r => r.codeHash === targetHash);
    if (match) {
      dbMatch = true;
      await prisma.loginOtp.deleteMany({
        where: { phone: { in: idArray } }
      }).catch(() => {});
    }
  } catch (dbErr) {
    console.warn('[OTP] Database unavailable for loginOtp verify, falling back to memory store:', dbErr.message);
  }

  if (dbMatch) {
    for (const id of idArray) memoryOtpStore.delete(id);
    return true;
  }

  // 2. Try In-Memory store fallback
  const now = Date.now();
  for (const id of idArray) {
    const item = memoryOtpStore.get(id);
    if (item && item.expiresAt > now && item.codeHash === targetHash) {
      for (const removeId of idArray) memoryOtpStore.delete(removeId);
      return true;
    }
  }

  return false;
}

module.exports = {
  OTP_TTL_MS,
  MAX_ATTEMPTS,
  normalizePhone,
  getPhoneVariants,
  hashCode,
  makeCode,
  createPendingSignup,
  getPendingSignup,
  updatePendingSignup,
  deletePendingSignup,
  sendEmailOtp,
  createLoginOtp,
  verifyLoginOtp
};

