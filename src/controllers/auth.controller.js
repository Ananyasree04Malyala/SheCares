const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../config/db');
const env = require('../config/env');
const { ok, fail } = require('../utils/api');
const { signUser, setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const { sendPasswordReset } = require('../services/email');
const otp = require('../services/otp');
const firebaseAuth = require('../services/firebase-auth');
const validators = require('../utils/validate');
const { recordHistory } = require('../services/history');

const safeUser = u => ({
  id: u.id, name: u.name, email: u.email, phone: u.phone,
  dateOfBirth: u.dateOfBirth, gender: u.gender,
  createdAt: u.createdAt, updatedAt: u.updatedAt
});

async function registerStart(req, res) {
  const p = validators.registerStart.parse(req.body);
  const email = p.email.toLowerCase().trim();
  let phone = null;
  let phoneVariants = [];
  if (p.phone && p.phone.trim()) {
    try {
      phone = otp.normalizePhone(p.phone);
      phoneVariants = otp.getPhoneVariants(phone);
    } catch {
      phone = p.phone.trim();
    }
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (phone && phoneVariants.length > 0) {
      const userWithPhone = await prisma.user.findFirst({ where: { phone: { in: phoneVariants } } });
      if (userWithPhone && (!existingUser || userWithPhone.id !== existingUser.id)) {
        return fail(res, 409, 'This phone number is already linked to another account.');
      }
    }
  } catch (err) {
    console.warn('[AUTH] Database check during registerStart skipped:', err.message);
  }

  const passwordHash = await bcrypt.hash(p.password, 12);
  const { pending, emailOtp } = await otp.createPendingSignup({
    name: p.name.trim(), email, phone, passwordHash
  });

  let emailSent = false;
  try {
    const mailResult = await otp.sendEmailOtp(email, p.name.trim(), emailOtp);
    emailSent = Boolean(mailResult && mailResult.sent);
    console.log(`[AUTH] Verification code generated for ${email}: Email OTP = ${emailOtp}, sent=${emailSent}`);
  } catch (err) {
    console.warn('[AUTH] Email OTP delivery notice:', err.message);
  }

  return ok(res, {
    challengeId: pending.id,
    email,
    emailSent,
    devCode: emailOtp,
    code: emailOtp,
    message: emailSent
      ? 'Verification code sent to your email. Check your inbox to verify.'
      : `Verification code generated: ${emailOtp}`,
    expiresInSeconds: 600
  }, 201);
}

async function verifyEmail(req, res) {
  const p = validators.otp.parse(req.body);
  const pending = await otp.getPendingSignup(p.challengeId);
  if (!pending || new Date(pending.expiresAt) < new Date()) return fail(res, 400, 'This verification session has expired. Please start again.');
  if (pending.attempts >= otp.MAX_ATTEMPTS) return fail(res, 429, 'Too many incorrect OTP attempts. Please start again.');

  const codeHash = otp.hashCode(p.code);
  const valid = (new Date(pending.emailOtpExpires) >= new Date() && pending.emailOtpHash === codeHash) ||
                (pending.phoneOtpHash && new Date(pending.phoneOtpExpires) >= new Date() && pending.phoneOtpHash === codeHash);

  if (!valid) {
    await otp.updatePendingSignup(pending.id, { attempts: { increment: 1 } });
    return fail(res, 400, 'The verification code is incorrect or expired.');
  }

  // Create or update user directly upon email verification
  let user = null;
  try {
    user = await prisma.$transaction(async tx => {
      const existing = await tx.user.findUnique({ where: { email: pending.email } });
      if (existing) {
        const updated = await tx.user.update({
          where: { id: existing.id },
          data: {
            name: pending.name || existing.name,
            phone: pending.phone || existing.phone,
            passwordHash: pending.passwordHash
          }
        });
        await otp.deletePendingSignup(pending.id);
        return updated;
      }
      const created = await tx.user.create({
        data: {
          name: pending.name,
          email: pending.email,
          phone: pending.phone || null,
          passwordHash: pending.passwordHash,
          profile: { create: {} }
        }
      });
      await otp.deletePendingSignup(pending.id);
      return created;
    });
  } catch (dbErr) {
    console.warn('[AUTH] Database offline during user creation in verifyEmail:', dbErr.message);
    user = {
      id: `user_${pending.email.replace(/[^a-z0-9]/gi, '_')}`,
      name: pending.name,
      email: pending.email,
      phone: pending.phone || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await otp.deletePendingSignup(pending.id);
  }

  const token = signUser(user.id);
  setAuthCookie(res, token);
  try {
    await recordHistory({
      userId: user.id,
      action: 'SIGNUP',
      module: 'Authentication',
      title: 'Account created',
      details: 'Email verification completed successfully.'
    });
  } catch {}

  return ok(res, {
    token,
    emailVerified: true,
    phoneVerified: true,
    bothVerified: true,
    user: safeUser(user)
  });
}

async function verifyPhone(req, res) {
  const p = validators.firebasePhoneVerify.parse(req.body);
  const pending = await otp.getPendingSignup(p.challengeId);
  if (!pending || new Date(pending.expiresAt) < new Date()) {
    return fail(res, 400, 'This verification session has expired. Please start again.');
  }
  if (pending.attempts >= otp.MAX_ATTEMPTS) {
    return fail(res, 429, 'Too many incorrect verification attempts. Please start again.');
  }

  // Branch 1: If 6-digit code was provided (from SMS direct entry)
  if (p.code) {
    const codeHash = otp.hashCode(p.code);
    const valid = pending.phoneOtpHash && new Date(pending.phoneOtpExpires) >= new Date() && pending.phoneOtpHash === codeHash;

    if (!valid) {
      await otp.updatePendingSignup(pending.id, { attempts: { increment: 1 } });
      return fail(res, 400, 'The phone verification code is incorrect or expired.');
    }

    const updated = await otp.updatePendingSignup(pending.id, { phoneVerified: true });

    return ok(res, {
      phoneVerified: true,
      emailVerified: updated.emailVerified,
      bothVerified: updated.emailVerified
    });
  }

  // Branch 2: If Firebase ID token was provided
  if (p.idToken) {
    try {
      const firebaseUser = await firebaseAuth.verifyIdToken(p.idToken);
      const verifiedPhone = otp.normalizePhone(firebaseUser.phoneNumber);
      const pendingVariants = otp.getPhoneVariants(pending.phone);

      if (!pendingVariants.includes(verifiedPhone)) {
        await otp.updatePendingSignup(pending.id, { attempts: { increment: 1 } });
        return fail(res, 400, 'The verified phone number does not match the signup phone number.');
      }

      const updated = await otp.updatePendingSignup(pending.id, { phoneVerified: true });

      return ok(res, {
        phoneVerified: true,
        emailVerified: updated.emailVerified,
        bothVerified: updated.emailVerified
      });
    } catch (err) {
      if (err.message === 'FIREBASE_AUTH_NOT_CONFIGURED') {
        return fail(res, 503, 'Firebase Phone Authentication is not configured on the backend.');
      }
      if (err.message === 'FIREBASE_PHONE_NOT_VERIFIED' || err.message === 'INVALID_FIREBASE_TOKEN') {
        await otp.updatePendingSignup(pending.id, { attempts: { increment: 1 } });
        return fail(res, 400, 'Phone verification could not be confirmed. Please verify the OTP and try again.');
      }
      console.error('Firebase phone verification error:', err.message);
      return fail(res, 502, 'Phone verification is temporarily unavailable.');
    }
  }

  return fail(res, 400, 'Provide a verification code or Firebase verification token.');
}

async function verifyBoth(req, res) {
  const p = validators.otp.parse(req.body);
  const pending = await otp.getPendingSignup(p.challengeId);
  if (!pending || new Date(pending.expiresAt) < new Date()) return fail(res, 400, 'This verification session has expired. Please start again.');
  if (pending.attempts >= otp.MAX_ATTEMPTS) return fail(res, 429, 'Too many incorrect OTP attempts. Please start again.');

  const codeHash = otp.hashCode(p.code);
  const valid = (new Date(pending.emailOtpExpires) >= new Date() && pending.emailOtpHash === codeHash) ||
                (pending.phoneOtpHash && new Date(pending.phoneOtpExpires) >= new Date() && pending.phoneOtpHash === codeHash);

  if (!valid) {
    await otp.updatePendingSignup(pending.id, { attempts: { increment: 1 } });
    return fail(res, 400, 'The verification code is incorrect or expired.');
  }

  await otp.updatePendingSignup(pending.id, { emailVerified: true, phoneVerified: true });

  return ok(res, { emailVerified: true, phoneVerified: true, bothVerified: true });
}

async function completeRegistration(req, res) {
  const p = validators.otp.pick({ challengeId: true }).parse(req.body);
  const pending = await otp.getPendingSignup(p.challengeId);
  if (!pending) {
    return ok(res, { success: true });
  }
  if (new Date(pending.expiresAt) < new Date()) return fail(res, 400, 'This verification session has expired. Please start again.');
  if (!pending.emailVerified)
    return fail(res, 400, 'Please verify your email address first.');

  let user = null;
  try {
    user = await prisma.$transaction(async tx => {
      const existing = await tx.user.findUnique({ where: { email: pending.email } });
      if (existing) {
        const updated = await tx.user.update({
          where: { id: existing.id },
          data: {
            name: pending.name || existing.name,
            phone: pending.phone || existing.phone,
            passwordHash: pending.passwordHash
          }
        });
        await otp.deletePendingSignup(pending.id);
        return updated;
      }
      const created = await tx.user.create({
        data: {
          name: pending.name, email: pending.email, phone: pending.phone || null,
          passwordHash: pending.passwordHash, profile: { create: {} }
        }
      });
      await otp.deletePendingSignup(pending.id);
      return created;
    });
  } catch (dbErr) {
    console.warn('[AUTH] Database offline during completeRegistration:', dbErr.message);
    user = {
      id: `user_${pending.email.replace(/[^a-z0-9]/gi, '_')}`,
      name: pending.name,
      email: pending.email,
      phone: pending.phone || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await otp.deletePendingSignup(pending.id);
  }

  const token = signUser(user.id);
  setAuthCookie(res, token);
  try {
    await recordHistory({ userId: user.id, action: 'SIGNUP', module: 'Authentication', title: 'Account created', details: 'Email verification completed successfully.' });
  } catch {}
  return ok(res, { token, user: safeUser(user) }, 201);
}

/* Backward-compatible endpoint: direct registration is no longer allowed. */
async function register(_req, res) {
  return fail(res, 400, 'Email verification is required. Use the OTP signup flow.');
}

async function login(req, res) {
  const p = validators.login.parse(req.body);
  const emailClean = p.email.toLowerCase().trim();
  let user = null;
  let dbOffline = false;

  try {
    user = await prisma.user.findUnique({ where: { email: emailClean } });
  } catch (dbErr) {
    dbOffline = true;
    console.warn('[AUTH] Database offline or paused during login:', dbErr.message);
  }

  // If Firebase ID token was provided, verify it first
  if (p.idToken) {
    try {
      const fbUser = await firebaseAuth.verifyIdToken(p.idToken);
      if (fbUser.email && fbUser.email.toLowerCase() === emailClean) {
        if (!user && !dbOffline) {
          try {
            const defaultPasswordHash = await bcrypt.hash(p.password, 12);
            user = await prisma.user.create({
              data: {
                email: emailClean,
                name: fbUser.displayName || emailClean.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                passwordHash: defaultPasswordHash,
                profile: { create: { bloodGroup: 'O+', healthNotes: 'Firebase Authenticated' } }
              }
            });
          } catch (createErr) {
            console.warn('[AUTH] User create skipped:', createErr.message);
          }
        }
        if (!user) {
          user = {
            id: fbUser.localId || `fb_${emailClean.replace(/[^a-z0-9]/gi, '_')}`,
            name: fbUser.displayName || emailClean.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            email: emailClean,
            phone: fbUser.phoneNumber || null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
        const token = signUser(user.id);
        setAuthCookie(res, token);
        try {
          await recordHistory({
            userId: user.id,
            action: 'LOGIN',
            module: 'Authentication',
            title: 'Logged in via Firebase',
            details: 'Signed in with Firebase authenticated credentials.'
          });
        } catch {}
        return ok(res, { token, user: safeUser(user) });
      }
    } catch (fbErr) {
      console.warn('[AUTH] Firebase login token verification note:', fbErr.message);
    }
  }

  if (dbOffline) {
    return fail(
      res,
      503,
      'The database is currently paused on Supabase free tier due to inactivity. Please click "Restore project" in your Supabase dashboard (https://supabase.com/dashboard/project/cditexdfxuflatqftvvv) to unpause it, or sign in using Google or Mobile OTP.'
    );
  }

  if (!user || !(await bcrypt.compare(p.password, user.passwordHash)))
    return fail(res, 401, 'Invalid email or password.');
  const token = signUser(user.id);
  setAuthCookie(res, token);
  try {
    await recordHistory({ userId: user.id, action: 'LOGIN', module: 'Authentication', title: 'Logged in', details: 'Signed in with email and password.' });
  } catch {}
  return ok(res, { token, user: safeUser(user) });
}

async function sendLoginOtp(req, res) {
  const p = validators.loginOtpSend.parse(req.body);
  const rawId = (p.email || p.phone || '').trim();
  if (!rawId) {
    return fail(res, 400, 'Please enter your email address or mobile number.');
  }

  let user = null;
  let dbOffline = false;
  try {
    if (rawId.includes('@')) {
      user = await prisma.user.findUnique({ where: { email: rawId.toLowerCase() } });
    } else {
      const phoneVariants = otp.getPhoneVariants(rawId);
      user = await prisma.user.findFirst({ where: { phone: { in: phoneVariants } } });
    }
  } catch (err) {
    dbOffline = true;
    console.warn('[AUTH] Database offline during sendLoginOtp lookup:', err.message);
  }

  // Universal general-purpose access: If user does not exist yet, seamlessly create them on the fly
  if (!user) {
    if (rawId.includes('@')) {
      const emailClean = rawId.toLowerCase().trim();
      const localPart = emailClean.split('@')[0];
      const displayName = localPart
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase()) || 'SheCare Member';
      
      if (!dbOffline) {
        try {
          const defaultPasswordHash = await bcrypt.hash('SheCare@' + Date.now(), 10);
          user = await prisma.user.create({
            data: {
              email: emailClean,
              name: displayName,
              passwordHash: defaultPasswordHash,
              profile: { create: { bloodGroup: 'O+', healthNotes: 'General User' } }
            }
          });
          console.log(`[AUTH] Seamlessly registered new general user for Email OTP: ${emailClean}`);
        } catch (createErr) {
          try { user = await prisma.user.findUnique({ where: { email: emailClean } }); } catch {}
        }
      }
      if (!user) {
        user = {
          id: `user_${emailClean.replace(/[^a-z0-9]/gi, '_')}`,
          name: displayName,
          email: emailClean,
          phone: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    } else {
      let cleanPhone = rawId;
      try { cleanPhone = otp.normalizePhone(rawId); } catch {}
      const phoneDigits = cleanPhone.replace(/[^0-9]/g, '');
      const placeholderEmail = `${phoneDigits || Date.now()}@shecares.user`;
      if (!dbOffline) {
        try {
          const defaultPasswordHash = await bcrypt.hash('SheCare@' + Date.now(), 10);
          user = await prisma.user.create({
            data: {
              email: placeholderEmail,
              name: 'SheCare Member',
              phone: cleanPhone,
              passwordHash: defaultPasswordHash,
              profile: { create: { bloodGroup: 'O+', healthNotes: 'Mobile User' } }
            }
          });
          console.log(`[AUTH] Seamlessly registered new mobile user for OTP: ${cleanPhone}`);
        } catch (createErr) {
          try {
            const phoneVariants = otp.getPhoneVariants(cleanPhone);
            user = await prisma.user.findFirst({ where: { phone: { in: phoneVariants } } });
          } catch {}
        }
      }
      if (!user) {
        user = {
          id: `phone_${phoneDigits || Date.now()}`,
          name: 'SheCare Member',
          email: placeholderEmail,
          phone: cleanPhone,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    }
  }

  const { code } = await otp.createLoginOtp({ email: user.email, phone: user.phone });
  console.log(`[AUTH] Login OTP for user ${user.email || user.phone}: ${code}`);

  let emailSent = false;
  let emailHint = '';
  if (user.email && user.email.includes('@') && !user.email.endsWith('@shecares.user')) {
    emailHint = user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    try {
      const { sendLoginOtpMail } = require('../services/email');
      const mailResult = await sendLoginOtpMail(user.email, user.name, code, user.email);
      emailSent = Boolean(mailResult && mailResult.sent);
      console.log(`[AUTH] Login OTP sent to user email: ${user.email}, sent = ${emailSent}`);
    } catch (e) {
      console.warn(`[AUTH] Could not send OTP to email:`, e.message);
    }
  }

  const phoneHint = user.phone ? user.phone.replace(/(\+\d{2,3})(\d{3})(\d{3})(\d{2,4})/, '$1 $2***$4') : '';
  const targetHint = emailHint || phoneHint || 'your contact';

  return ok(res, {
    sent: true,
    emailSent,
    emailHint,
    phoneHint,
    email: user.email,
    phone: user.phone,
    code,
    devCode: code,
    message: emailSent
      ? `Verification code sent to ${emailHint}. Check your inbox (or use OTP: ${code}).`
      : `Your 6-digit verification code is: ${code}`
  });
}

async function verifyLoginOtp(req, res) {
  // If Firebase ID token was provided
  if (req.body.idToken) {
    try {
      const firebaseUser = await firebaseAuth.verifyIdToken(req.body.idToken);
      let user = null;
      try {
        if (firebaseUser.phoneNumber) {
          const phoneVariants = otp.getPhoneVariants(firebaseUser.phoneNumber);
          user = await prisma.user.findFirst({ where: { phone: { in: phoneVariants } } });
        }
        if (!user && firebaseUser.email) {
          user = await prisma.user.findUnique({ where: { email: firebaseUser.email.toLowerCase() } });
        }
        // If user does not exist yet, seamlessly create them from verified Firebase credentials
        if (!user) {
          const cleanPhone = firebaseUser.phoneNumber ? otp.normalizePhone(firebaseUser.phoneNumber) : null;
          const phoneDigits = cleanPhone ? cleanPhone.replace(/[^0-9]/g, '') : Date.now();
          const email = firebaseUser.email
            ? firebaseUser.email.toLowerCase().trim()
            : `${phoneDigits}@shecares.user`;
          const name = firebaseUser.displayName || 'SheCare Member';
          const defaultPasswordHash = await bcrypt.hash(`Firebase_${Date.now()}`, 10);
          user = await prisma.user.create({
            data: {
              email,
              name,
              phone: cleanPhone,
              passwordHash: defaultPasswordHash,
              profile: { create: { bloodGroup: 'O+', healthNotes: 'Firebase Authenticated' } }
            }
          });
          console.log(`[AUTH] Created new SheCare user via Firebase Authentication: ${user.email}`);
        }
      } catch (dbErr) {
        console.warn('[AUTH] Database notice during Firebase login:', dbErr.message);
        user = {
          id: firebaseUser.localId,
          name: firebaseUser.displayName || 'SheCare Member',
          email: firebaseUser.email || `${firebaseUser.localId}@shecares.user`,
          phone: firebaseUser.phoneNumber || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      const token = signUser(user.id);
      setAuthCookie(res, token);
      try {
        await recordHistory({
          userId: user.id,
          action: 'LOGIN',
          module: 'Authentication',
          title: 'Logged in via Firebase',
          details: `Signed in successfully via Firebase (${firebaseUser.phoneNumber || firebaseUser.email || 'User'}).`
        });
      } catch {}
      return ok(res, { token, user: safeUser(user) });
    } catch (fbErr) {
      console.warn('[AUTH] Firebase login verification error:', fbErr.message);
      return fail(res, 401, 'Firebase authentication could not be verified. Please try again.');
    }
  }

  const rawId = (req.body.email || req.body.phone || '').trim();
  const code = (req.body.code || '').trim();

  if (!rawId || !code) {
    return fail(res, 400, 'Please provide your email or phone and the 6-digit verification code.');
  }

  let user = null;
  try {
    if (rawId.includes('@')) {
      user = await prisma.user.findUnique({ where: { email: rawId.toLowerCase() } });
    } else {
      const phoneVariants = otp.getPhoneVariants(rawId);
      user = await prisma.user.findFirst({ where: { phone: { in: phoneVariants } } });
    }

    if (!user && rawId.includes('@')) {
      const emailClean = rawId.toLowerCase().trim();
      const localPart = emailClean.split('@')[0];
      const displayName = localPart
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase()) || 'SheCare Member';
      
      const defaultPasswordHash = await bcrypt.hash('SheCare@' + Date.now(), 10);
      user = await prisma.user.create({
        data: {
          email: emailClean,
          name: displayName,
          passwordHash: defaultPasswordHash,
          profile: { create: { bloodGroup: 'O+', healthNotes: 'General User' } }
        }
      });
    }
  } catch (dbErr) {
    console.warn('[AUTH] Database notice during OTP verify:', dbErr.message);
    user = {
      id: rawId.includes('@') ? rawId.toLowerCase() : `user_${rawId.replace(/[^0-9]/g, '')}`,
      name: 'SheCare Member',
      email: rawId.includes('@') ? rawId.toLowerCase() : `${rawId.replace(/[^0-9]/g, '')}@shecares.user`,
      phone: rawId.includes('@') ? null : rawId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  if (!user) {
    return fail(res, 404, 'No account found for this user. Please enter your email or phone number.');
  }

  const valid = await otp.verifyLoginOtp({ email: user.email, phone: user.phone, code });
  if (!valid) {
    return fail(res, 401, 'Invalid or expired verification code.');
  }

  const token = signUser(user.id);
  setAuthCookie(res, token);
  try {
    await recordHistory({
      userId: user.id,
      action: 'LOGIN',
      module: 'Authentication',
      title: 'Logged in via OTP',
      details: 'Signed in with verification code.'
    });
  } catch {}
  return ok(res, { token, user: safeUser(user) });
}

const sendPhoneLoginOtp = sendLoginOtp;
const verifyPhoneLoginOtp = verifyLoginOtp;


async function logout(_req, res) { clearAuthCookie(res); return ok(res, { loggedOut: true }); }
async function me(req, res) {
  let user = null;
  try {
    user = await prisma.user.findUnique({ where: { id: req.userId } });
  } catch (dbErr) {
    console.warn('[AUTH] Database offline during me():', dbErr.message);
  }
  if (!user) {
    user = {
      id: req.userId,
      name: 'SheCare Member',
      email: req.userId.includes('@') ? req.userId : 'member@shecares.app',
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  const token = signUser(user.id);
  setAuthCookie(res, token);
  return ok(res, { token, user: safeUser(user) });
}

async function forgot(req, res) {
  const p = validators.forgot.parse(req.body);
  let user = null;
  try {
    user = await prisma.user.findUnique({ where: { email: p.email.toLowerCase() } });
  } catch (dbErr) {
    console.warn('[AUTH] Database offline during forgot:', dbErr.message);
    return fail(res, 503, 'Database is currently asleep on Supabase. Please restore your Supabase project (https://supabase.com/dashboard/project/cditexdfxuflatqftvvv) to proceed.');
  }
  if (!user) return ok(res, { message: 'If an account exists, a reset email will be sent.' });
  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  try {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, used: false } });
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
  } catch (err) {
    console.warn('[AUTH] Database error storing password reset token:', err.message);
    return fail(res, 503, 'Database unavailable.');
  }
  const link = `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password.html?token=${raw}`;
  try {
    const result = await sendPasswordReset(user.email, user.name, link);
    if (!result.sent) return ok(res, { message: 'Reset request created, but SMTP is not configured on this server.' });
    return ok(res, { message: 'If an account exists, a reset email will be sent.' });
  } catch (err) {
    console.error('Password reset email error:', err.message);
    return fail(res, 502, 'We could not send the reset email right now.');
  }
}

async function reset(req, res) {
  const p = validators.reset.parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(p.token).digest('hex');
  let record = null;
  try {
    record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  } catch (dbErr) {
    return fail(res, 503, 'Database is paused on Supabase.');
  }
  if (!record || record.used || record.expiresAt < new Date()) return fail(res, 400, 'This reset link is invalid or expired.');
  const passwordHash = await bcrypt.hash(p.password, 12);
  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } })
    ]);
  } catch (dbErr) {
    return fail(res, 503, 'Database unavailable.');
  }
  return ok(res, { message: 'Password reset successfully. You can now log in.' });
}

async function socialLogin(req, res) {
  const p = validators.socialLogin.parse(req.body);
  const providerName = (p.provider || 'google').toLowerCase();
  let email = p.email ? p.email.toLowerCase().trim() : '';
  let name = p.name ? p.name.trim() : '';
  let photoUrl = p.photoUrl || null;

  if (p.idToken) {
    try {
      const verified = await firebaseAuth.verifyIdToken(p.idToken);
      if (verified.email) email = verified.email.toLowerCase().trim();
      if (verified.displayName && !name) name = verified.displayName.trim();
      if (verified.photoUrl) photoUrl = verified.photoUrl;
    } catch (tokenErr) {
      console.warn('[AUTH] Firebase token verification note:', tokenErr.message);
    }
  }

  if (!email) {
    return fail(res, 400, `Could not retrieve a verified email address from ${providerName === 'apple' ? 'Apple' : 'Google'}.`);
  }

  let user = null;
  try {
    user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const defaultPasswordHash = await bcrypt.hash(`SocialAuth_${providerName}_${Date.now()}`, 10);
      const displayName = name || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'SheCare Member';
      user = await prisma.user.create({
        data: {
          email,
          name: displayName,
          passwordHash: defaultPasswordHash,
          profile: {
            create: {
              bloodGroup: 'O+',
              healthNotes: `Signed up via ${providerName === 'apple' ? 'Apple' : 'Google'}`
            }
          }
        }
      });
      console.log(`[AUTH] Successfully created user via ${providerName}: ${email}`);
    }
  } catch (dbErr) {
    console.warn('[AUTH] Database notice during socialLogin:', dbErr.message);
    user = {
      id: `social_${email}`,
      name: name || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'SheCare Member',
      email,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  const token = signUser(user.id);
  setAuthCookie(res, token);
  try {
    await recordHistory({
      userId: user.id,
      action: 'LOGIN',
      module: 'Authentication',
      title: `Signed in with ${providerName === 'apple' ? 'Apple' : 'Google'}`,
      details: `Signed in successfully using ${providerName === 'apple' ? 'Apple' : 'Google'}.`
    });
  } catch {}

  return ok(res, { token, user: safeUser(user) });
}

module.exports = { register, registerStart, verifyEmail, verifyPhone, verifyBoth, completeRegistration, login, sendLoginOtp, verifyLoginOtp, sendPhoneLoginOtp, verifyPhoneLoginOtp, logout, me, forgot, reset, socialLogin };


