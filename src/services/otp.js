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
    from: env.SMTP_FROM,
    to: email,
    subject: 'SheCare email verification code',
    text: `Hello ${name || 'there'},\n\nYour SheCare email verification code is: ${emailOtp}\n\nThis code expires in 10 minutes. Never share it with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;padding:20px;border:1px solid #f3d4e1;border-radius:12px;">
        <h2 style="color:#e83e83;margin-top:0;">SHECARES Verification</h2>
        <p>Hello ${name || 'there'},</p>
        <p>Thank you for signing up with SheCare. Here is your email verification code:</p>
        <div style="margin-top:12px;padding:12px;background:#f8f9fa;border-radius:8px;">
          <p style="margin:0;font-size:14px;color:#333;font-weight:600;">Email Verification Code:</p>
          <p style="margin:4px 0 0;font-size:28px;font-weight:700;letter-spacing:6px;color:#333;">${emailOtp}</p>
        </div>
        <p style="margin-top:20px;font-size:13px;color:#777;">This code expires in 10 minutes. Never share it with anyone.</p>
      </div>`
  });
  if (!result.sent) throw new Error('EMAIL_OTP_NOT_CONFIGURED');
}

async function createPendingSignup({ name, email, phone, passwordHash }) {
  const emailOtp = makeCode();
  const phoneOtp = makeCode();
  const now = Date.now();
  const cleanPhone = phone ? String(phone).trim() : '';
  const phoneVariants = cleanPhone ? getPhoneVariants(cleanPhone) : [];

  await prisma.pendingSignup.deleteMany({
    where: {
      OR: [
        { email },
        ...(phoneVariants.length > 0 ? [{ phone: { in: phoneVariants } }] : [])
      ]
    }
  });

  const pending = await prisma.pendingSignup.create({
    data: {
      name,
      email,
      phone: cleanPhone,
      passwordHash,
      emailOtpHash: hashCode(emailOtp),
      emailOtpExpires: new Date(now + OTP_TTL_MS),
      phoneOtpHash: hashCode(phoneOtp),
      phoneOtpExpires: new Date(now + OTP_TTL_MS),
      phoneVerified: true, // Auto-verified: ONLY email OTP verification is required
      emailVerified: false,
      expiresAt: new Date(now + OTP_TTL_MS)
    }
  });

  return { pending, emailOtp, phoneOtp };
}

async function createLoginOtp({ email, phone }) {
  const code = makeCode();
  const identifiers = new Set();
  if (email) identifiers.add(String(email).trim().toLowerCase());
  if (phone) {
    getPhoneVariants(phone).forEach(v => identifiers.add(v));
  }
  const idArray = Array.from(identifiers);

  await prisma.loginOtp.deleteMany({
    where: { phone: { in: idArray } }
  });

  const primaryKey = email ? String(email).trim().toLowerCase() : (phone || '');
  const record = await prisma.loginOtp.create({
    data: {
      phone: primaryKey,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS)
    }
  });

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

  const records = await prisma.loginOtp.findMany({
    where: {
      phone: { in: idArray },
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  const match = records.find(r => r.codeHash === targetHash);
  if (!match) return false;

  await prisma.loginOtp.deleteMany({
    where: { phone: { in: idArray } }
  }).catch(() => {});

  return true;
}

module.exports = {
  OTP_TTL_MS,
  MAX_ATTEMPTS,
  normalizePhone,
  getPhoneVariants,
  hashCode,
  makeCode,
  createPendingSignup,
  sendEmailOtp,
  createLoginOtp,
  verifyLoginOtp
};

