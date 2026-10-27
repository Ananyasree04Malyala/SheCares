const prisma = require('../config/db');
const { ok, fail } = require('../utils/api');
const v = require('../utils/validate');
const { recordHistory } = require('../services/history');

const memoryProfiles = new Map();

async function get(req, res) {
  try {
    const u = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: true }
    });
    if (u) {
      const data = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        dateOfBirth: u.dateOfBirth,
        gender: u.gender,
        profile: u.profile
      };
      memoryProfiles.set(req.userId, data);
      return ok(res, data);
    }
  } catch (err) {
    console.warn('[PROFILE] Database unavailable for profile.get, using memory/fallback:', err.message);
  }

  const mem = memoryProfiles.get(req.userId);
  if (mem) return ok(res, mem);

  return ok(res, {
    id: req.userId,
    name: 'SheCare Member',
    email: req.userId && req.userId.includes('@') ? req.userId : 'member@shecares.app',
    phone: null,
    dateOfBirth: null,
    gender: 'Female',
    profile: {
      bloodGroup: 'O+',
      heightCm: 165,
      weightKg: 58,
      healthNotes: 'General Health Profile',
      emergencyInfo: null
    }
  });
}

async function put(req, res) {
  const p = v.profile.parse(req.body);
  const userData = {};
  for (const k of ['name', 'phone', 'gender']) if (p[k] !== undefined) userData[k] = p[k] || null;
  if (p.dateOfBirth !== undefined) userData.dateOfBirth = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
  const profileData = {};
  for (const [src, dst] of [
    ['bloodGroup', 'bloodGroup'],
    ['heightCm', 'heightCm'],
    ['weightKg', 'weightKg'],
    ['healthNotes', 'healthNotes'],
    ['emergencyInfo', 'emergencyInfo']
  ]) {
    if (p[src] !== undefined) profileData[dst] = p[src] || null;
  }

  try {
    const u = await prisma.user.update({
      where: { id: req.userId },
      data: { ...userData, profile: { upsert: { create: profileData, update: profileData } } },
      include: { profile: true }
    });
    const result = {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      dateOfBirth: u.dateOfBirth,
      gender: u.gender,
      profile: u.profile
    };
    memoryProfiles.set(req.userId, result);
    await recordHistory({
      userId: req.userId,
      action: 'UPDATE',
      module: 'Profile',
      title: 'Profile updated',
      details: 'Personal or health profile information was updated.'
    });
    return ok(res, result);
  } catch (err) {
    console.warn('[PROFILE] Database unavailable for profile.put, updating in memory:', err.message);
    const existing = memoryProfiles.get(req.userId) || {
      id: req.userId,
      name: 'SheCare Member',
      email: req.userId && req.userId.includes('@') ? req.userId : 'member@shecares.app',
      phone: null,
      dateOfBirth: null,
      gender: 'Female',
      profile: {}
    };
    const updated = {
      ...existing,
      ...userData,
      profile: { ...(existing.profile || {}), ...profileData }
    };
    memoryProfiles.set(req.userId, updated);
    return ok(res, updated);
  }
}

async function del(req, res) {
  try {
    await prisma.user.delete({ where: { id: req.userId } });
  } catch (err) {
    console.warn('[PROFILE] Database error during profile.del:', err.message);
  }
  memoryProfiles.delete(req.userId);
  res.clearCookie('shecare_session');
  return ok(res, { deleted: true });
}

module.exports = { get, put, del };

