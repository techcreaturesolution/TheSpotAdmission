import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimit.js';
import { User } from '../models/User.js';
import { sendOtp, verifyOtp } from '../services/otp.js';
import { HttpError } from '../utils/httpError.js';
import { normalizePhone } from '../utils/text.js';

const router = Router();

const roleFor = (email, requested) => (email && env.adminEmails.includes(email.toLowerCase()) ? 'admin' : requested);

const session = async (user) => {
  user.lastLoginAt = new Date();
  await user.save();
  return { token: signToken(user), user: user.toPublic() };
};

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().optional(),
  password: z.string().min(8).max(100),
  role: z.enum(['student', 'institution']).default('student'),
});

router.post('/register', authLimiter, async (req, res) => {
  const data = registerSchema.parse(req.body);
  const phone = data.phone ? normalizePhone(data.phone) : undefined;
  const or = [{ email: data.email }];
  if (phone) or.push({ phone });
  if (await User.exists({ $or: or })) throw new HttpError(409, 'An account with this email or phone already exists');
  const user = await User.create({
    name: data.name,
    email: data.email,
    phone,
    role: roleFor(data.email, data.role),
    passwordHash: await bcrypt.hash(data.password, 10),
  });
  res.status(201).json(await session(user));
});

const loginSchema = z.object({ identifier: z.string().trim().min(3), password: z.string().min(1) });

router.post('/login', authLimiter, async (req, res) => {
  const { identifier, password } = loginSchema.parse(req.body);
  const query = identifier.includes('@') ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) };
  const user = await User.findOne(query).select('+passwordHash');
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Incorrect email/phone or password');
  }
  if (!user.active) throw new HttpError(403, 'This account is disabled');
  const desired = roleFor(user.email, user.role);
  if (desired !== user.role) user.role = desired;
  res.json(await session(user));
});

const otpSendSchema = z.object({
  phone: z.string().min(10),
  purpose: z.enum(['login', 'lead', 'spot-alert', 'counselling', 'application']).default('login'),
});

router.post('/otp/send', otpLimiter, async (req, res) => {
  const { phone, purpose } = otpSendSchema.parse(req.body);
  res.json(await sendOtp(phone, purpose));
});

const otpLoginSchema = z.object({
  phone: z.string().min(10),
  code: z.string().min(4).max(8),
  name: z.string().trim().min(2).max(100).optional(),
  role: z.enum(['student', 'institution']).default('student'),
});

router.post('/otp/login', authLimiter, async (req, res) => {
  const data = otpLoginSchema.parse(req.body);
  const phone = normalizePhone(data.phone);
  let user = await User.findOne({ phone });
  if (!user && !data.name) throw new HttpError(400, 'New here? Please enter your name to create an account.', { needsName: true });
  const verified = await verifyOtp(phone, 'login', data.code);
  if (!user) user = await User.create({ name: data.name, phone: verified, phoneVerified: true, role: data.role });
  if (!user.active) throw new HttpError(403, 'This account is disabled');
  user.phoneVerified = true;
  res.json(await session(user));
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

router.post('/password', requireAuth, async (req, res) => {
  const { current, password } = z.object({ current: z.string().optional(), password: z.string().min(8).max(100) }).parse(req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (user.passwordHash && !(await bcrypt.compare(current || '', user.passwordHash))) throw new HttpError(400, 'Current password is incorrect');
  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  res.json({ ok: true });
});

export default router;
