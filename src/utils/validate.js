const { z } = require('zod');
const email = z.string().trim().email().max(254);
const password = z.string().min(8).max(128);
const id = z.string().min(1).max(100);
const phone = z.string().trim().min(8).max(30);
const otp = z.string().trim().regex(/^\d{4,10}$/, 'Enter the verification code.');
const optionalPhone = z.string().trim().max(30).optional().or(z.literal(''));
const validators = {
  register: z.object({ name: z.string().trim().min(2).max(100), email, phone: optionalPhone, password }),
  registerStart: z.object({ name: z.string().trim().min(2).max(100), email, phone: optionalPhone, password }),
  otp: z.object({ challengeId: id, code: otp }),
  firebasePhoneVerify: z.object({
    challengeId: id,
    idToken: z.string().min(50).max(10000).optional(),
    code: otp.optional()
  }).refine(d => Boolean(d.idToken || d.code), {
    message: 'Provide either a verification code or Firebase verification.'
  }),
  loginOtpSend: z.object({
    email: email.optional(),
    phone: z.string().optional()
  }).refine(d => Boolean(d.email || d.phone), { message: 'Provide an email address or mobile number.' }),
  loginOtpVerify: z.object({
    email: email.optional(),
    phone: z.string().optional(),
    code: otp
  }).refine(d => Boolean(d.email || d.phone), { message: 'Provide an email address or mobile number.' }),
  phoneLoginStart: z.object({
    phone: z.string().optional(),
    email: email.optional()
  }),
  phoneLoginVerify: z.object({
    phone: z.string().optional(),
    email: email.optional(),
    code: otp.optional(),
    idToken: z.string().min(50).max(10000).optional()
  }).refine(d => Boolean(d.idToken || ((d.phone || d.email) && d.code)), {
    message: 'Provide identifier and code or Firebase verification.'
  }),
  firebasePhoneLoginVerify: z.object({
    phone: phone.optional(),
    code: otp.optional(),
    idToken: z.string().min(50).max(10000).optional()
  }).refine(d => Boolean(d.idToken || (d.phone && d.code)), {
    message: 'Provide phone and code or Firebase verification.'
  }),
  login: z.object({ email, password: z.string().min(1).max(128) }),

  forgot: z.object({ email }),
  reset: z.object({ token: z.string().min(20).max(300), password }),
  profile: z.object({ name: z.string().trim().min(2).max(100).optional(), phone: z.string().trim().max(30).optional().or(z.literal('')), dateOfBirth: z.string().optional().or(z.literal('')), gender: z.string().trim().max(50).optional(), bloodGroup: z.string().trim().max(10).optional(), heightCm: z.coerce.number().positive().max(300).optional().nullable(), weightKg: z.coerce.number().positive().max(500).optional().nullable(), healthNotes: z.string().max(5000).optional(), emergencyInfo: z.string().max(2000).optional() }),
  emergencyContact: z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().min(5).max(30), relationship: z.string().trim().max(50).optional() }),
  bp: z.object({ systolic: z.coerce.number().int().min(50).max(300), diastolic: z.coerce.number().int().min(30).max(200), pulse: z.coerce.number().int().min(20).max(250).optional().nullable(), notes: z.string().max(1000).optional() }),
  glucose: z.object({ value: z.coerce.number().min(1).max(2000), readingType: z.string().trim().min(1).max(50), notes: z.string().max(1000).optional() }),
  period: z.object({ periodStart: z.coerce.date(), periodEnd: z.coerce.date().optional().nullable(), cycleLength: z.coerce.number().int().min(10).max(100).optional().nullable(), notes: z.string().max(1000).optional() }),
  pregnancy: z.object({ lastMenstrualPeriod: z.coerce.date().optional().nullable(), estimatedDueDate: z.coerce.date().optional().nullable(), notes: z.string().max(2000).optional() }),
  appointment: z.object({ title: z.string().trim().max(100).optional(), doctor: z.string().trim().min(2).max(120), date: z.coerce.date(), time: z.string().trim().min(1).max(20), location: z.string().trim().max(200).optional(), notes: z.string().max(2000).optional(), status: z.string().trim().max(30).optional() }),
  reminder: z.object({ title: z.string().trim().min(1).max(120), description: z.string().max(500).optional(), reminderDate: z.coerce.date().optional().nullable(), reminderTime: z.string().trim().min(1).max(20), repeatPattern: z.string().trim().max(50).optional(), completed: z.boolean().optional() }),
  medicine: z.object({ name: z.string().trim().min(1).max(120), dosage: z.string().trim().max(100).optional(), frequency: z.string().trim().max(100).optional(), startDate: z.coerce.date().optional().nullable(), endDate: z.coerce.date().optional().nullable(), notes: z.string().max(1000).optional() }),
  mood: z.object({ mood: z.string().trim().min(1).max(50), notes: z.string().max(1000).optional() }),
  water: z.object({ amount: z.coerce.number().positive().max(10000) }),
  fitness: z.object({ activity: z.string().trim().min(1).max(100), duration: z.coerce.number().int().positive().max(1440).optional().nullable(), calories: z.coerce.number().int().nonnegative().max(10000).optional().nullable() }),
  chat: z.object({ message: z.string().trim().min(1).max(2000), conversationId: id.nullable().optional() }),
  sos: z.object({ latitude: z.coerce.number().min(-90).max(90).optional().nullable(), longitude: z.coerce.number().min(-180).max(180).optional().nullable(), address: z.string().max(500).optional() })
};
module.exports = validators;
