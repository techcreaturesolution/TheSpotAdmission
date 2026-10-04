import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Application } from '../models/Application.js';
import { Counselling } from '../models/Counselling.js';
import { Institution } from '../models/Institution.js';
import { Lead } from '../models/Lead.js';
import { Notification } from '../models/Notification.js';
import { Review } from '../models/Review.js';
import { SpotAlert } from '../models/SpotAlert.js';
import { User } from '../models/User.js';
import { PUBLIC_CARD_FIELDS, toCard } from '../services/institutions.js';
import { notifyUser } from '../services/notify.js';
import { verifyOtp } from '../services/otp.js';
import { HttpError } from '../utils/httpError.js';
import { isIndianMobile, normalizePhone } from '../utils/text.js';

const router = Router();
const isId = (v) => mongoose.isValidObjectId(v);

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  profile: z
    .object({
      city: z.string().trim().max(60).optional(),
      state: z.string().trim().max(60).optional(),
      currentClass: z.string().trim().max(60).optional(),
      stream: z.string().trim().max(60).optional(),
      marks: z.string().trim().max(30).optional(),
      interests: z.array(z.string().trim().max(60)).max(20).optional(),
    })
    .optional(),
});

router.put('/', async (req, res) => {
  const data = profileSchema.parse(req.body);
  if (data.email && data.email !== req.user.email && (await User.exists({ email: data.email, _id: { $ne: req.user._id } }))) {
    throw new HttpError(409, 'Email is already used by another account');
  }
  if (data.name) req.user.name = data.name;
  if (data.email !== undefined) req.user.email = data.email || undefined;
  if (data.profile) req.user.profile = { ...(req.user.profile?.toObject?.() || req.user.profile || {}), ...data.profile };
  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

router.post('/phone', async (req, res) => {
  const { phone, code } = z.object({ phone: z.string().refine(isIndianMobile, 'Invalid mobile'), code: z.string().min(4) }).parse(req.body);
  const normalized = normalizePhone(phone);
  if (await User.exists({ phone: normalized, _id: { $ne: req.user._id } })) throw new HttpError(409, 'This mobile number is linked to another account');
  await verifyOtp(normalized, 'login', code);
  req.user.phone = normalized;
  req.user.phoneVerified = true;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

router.get('/shortlist', async (req, res) => {
  const items = await Institution.find({ _id: { $in: req.user.shortlist }, status: 'approved' }).select(PUBLIC_CARD_FIELDS).lean();
  res.json({ items: items.map(toCard) });
});

router.post('/shortlist/:id', async (req, res) => {
  if (!isId(req.params.id) || !(await Institution.exists({ _id: req.params.id, status: 'approved' }))) throw new HttpError(404, 'Institution not found');
  await User.updateOne({ _id: req.user._id }, { $addToSet: { shortlist: req.params.id } });
  const user = await User.findById(req.user._id);
  res.json({ shortlist: user.shortlist.map(String) });
});

router.delete('/shortlist/:id', async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { shortlist: req.params.id } });
  const user = await User.findById(req.user._id);
  res.json({ shortlist: user.shortlist.map(String) });
});

router.get('/enquiries', async (req, res) => {
  const or = [{ student: req.user._id }];
  if (req.user.phone && req.user.phoneVerified) or.push({ phone: req.user.phone });
  const items = await Lead.find({ $or: or }).populate('institution', 'name slug address.city logo').sort({ createdAt: -1 }).lean();
  res.json({
    items: items.map((l) => ({ id: String(l._id), institution: l.institution, course: l.course, status: l.status, source: l.source, createdAt: l.createdAt, lastEnquiryAt: l.lastEnquiryAt })),
  });
});

router.get('/applications', async (req, res) => {
  const items = await Application.find({ student: req.user._id }).populate('institution', 'name slug address.city logo').sort({ createdAt: -1 }).lean();
  res.json({ items });
});

const applicationSchema = z.object({
  institutionId: z.string().refine(isId),
  courseName: z.string().trim().min(2).max(120),
  personal: z.object({
    name: z.string().trim().min(2).max(100),
    dob: z.string().max(20).optional(),
    gender: z.string().max(20).optional(),
    phone: z.string().refine(isIndianMobile, 'Invalid mobile'),
    email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
    address: z.string().max(300).optional(),
    category: z.string().max(20).optional(),
  }),
  academic: z
    .object({
      lastExam: z.string().max(60).optional(),
      board: z.string().max(60).optional(),
      percentage: z.coerce.number().min(0).max(100).optional(),
      entranceExam: z.string().max(60).optional(),
      entranceScore: z.string().max(30).optional(),
    })
    .default({}),
  parent: z.object({ fatherName: z.string().max(100).optional(), motherName: z.string().max(100).optional(), guardianPhone: z.string().max(15).optional() }).default({}),
  documents: z.array(z.object({ label: z.string().max(60), url: z.string().max(300) })).max(10).default([]),
  declaration: z.literal(true, { message: 'Please accept the declaration' }),
});

router.post('/applications', async (req, res) => {
  if (req.user.role !== 'student') throw new HttpError(403, 'Only student accounts can apply');
  const data = applicationSchema.parse(req.body);
  const inst = await Institution.findOne({ _id: data.institutionId, status: 'approved' }).select('name owner courses.name');
  if (!inst) throw new HttpError(404, 'Institution not found');
  if (inst.courses.length && !inst.courses.some((c) => c.name === data.courseName)) throw new HttpError(400, 'Select a course offered by this institution');
  const open = await Application.exists({ student: req.user._id, institution: inst._id, courseName: data.courseName, status: { $nin: ['rejected', 'withdrawn'] } });
  if (open) throw new HttpError(409, 'You already have an active application for this course');
  const app = await Application.create({
    ...data,
    personal: { ...data.personal, phone: normalizePhone(data.personal.phone) },
    student: req.user._id,
    institution: inst._id,
    timeline: [{ status: 'submitted', note: 'Application submitted' }],
  });
  await notifyUser(inst.owner, `New application: ${data.courseName}`, data.personal.name, '/institution/applications');
  res.status(201).json({ application: app });
});

router.post('/applications/:id/withdraw', async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, student: req.user._id });
  if (!app) throw new HttpError(404, 'Application not found');
  if (['admitted', 'rejected', 'withdrawn'].includes(app.status)) throw new HttpError(400, `Application is already ${app.status}`);
  app.status = 'withdrawn';
  app.timeline.push({ status: 'withdrawn', note: 'Withdrawn by student' });
  await app.save();
  res.json({ application: app });
});

router.get('/counselling', async (req, res) => {
  const or = [{ student: req.user._id }];
  if (req.user.phone && req.user.phoneVerified) or.push({ phone: req.user.phone });
  res.json({ items: await Counselling.find({ $or: or }).sort({ createdAt: -1 }).lean() });
});

router.get('/reviews', async (req, res) => {
  res.json({ items: await Review.find({ user: req.user._id }).populate('institution', 'name slug').sort({ createdAt: -1 }).lean() });
});

router.get('/alerts', async (req, res) => {
  const or = [{ user: req.user._id }];
  if (req.user.phone) or.push({ phone: req.user.phone });
  res.json({ items: await SpotAlert.find({ $or: or, active: true }).lean() });
});

router.delete('/alerts/:id', async (req, res) => {
  const or = [{ user: req.user._id }];
  if (req.user.phone) or.push({ phone: req.user.phone });
  await SpotAlert.updateOne({ _id: req.params.id, $or: or }, { $set: { active: false } });
  res.json({ ok: true });
});

router.get('/notifications', async (req, res) => {
  const filter = req.user.role === 'admin' ? { $or: [{ user: req.user._id }, { audience: 'admins' }] } : { user: req.user._id };
  const [items, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ ...filter, read: false }),
  ]);
  res.json({ items, unread });
});

router.post('/notifications/read', async (req, res) => {
  const filter = req.user.role === 'admin' ? { $or: [{ user: req.user._id }, { audience: 'admins' }] } : { user: req.user._id };
  await Notification.updateMany({ ...filter, read: false }, { $set: { read: true } });
  res.json({ ok: true });
});

export default router;
