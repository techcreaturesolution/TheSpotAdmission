import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Application } from '../models/Application.js';
import { AuditLog } from '../models/AuditLog.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { Content, CONTENT_KINDS } from '../models/Content.js';
import { Counselling, COUNSELLING_STATUS } from '../models/Counselling.js';
import { Institution, INSTITUTION_STATUS } from '../models/Institution.js';
import { Lead, LEAD_STATUS } from '../models/Lead.js';
import { MASTER_KINDS, MasterData } from '../models/MasterData.js';
import { Review } from '../models/Review.js';
import { SpotAdmission } from '../models/SpotAdmission.js';
import { SpotAlert } from '../models/SpotAlert.js';
import { Testimonial } from '../models/Testimonial.js';
import { User } from '../models/User.js';
import { profileCompleteness } from '../services/institutions.js';
import { notifyUser } from '../services/notify.js';
import { recomputeRating } from '../services/reviews.js';
import { alertSubscribers } from '../services/spot.js';
import { HttpError } from '../utils/httpError.js';
import { escapeRegex, paginate, slugify, toCsv } from '../utils/text.js';
import { institutionBody, uniqueSlug } from './institution.js';

const router = Router();
const isId = (v) => mongoose.isValidObjectId(v);
const audit = (req, action, target, meta) => AuditLog.create({ actor: req.user._id, action, target: target && String(target), meta }).catch(() => {});
const rx = (v) => new RegExp(escapeRegex(String(v).trim()), 'i');

const sendCsv = (res, name, rows, columns) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
  res.send(toCsv(rows, columns));
};

router.get('/stats', async (_req, res) => {
  const since = new Date(Date.now() - 30 * 86400_000);
  const [usersByRole, instByStatus, leads, leads30, pendingReviews, pendingSpots, liveSpots, counselling, messages, applications, daily] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
    Institution.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Lead.countDocuments(),
    Lead.countDocuments({ createdAt: { $gte: since } }),
    Review.countDocuments({ status: 'pending' }),
    SpotAdmission.countDocuments({ status: 'pending' }),
    SpotAdmission.countDocuments({ status: 'live' }),
    Counselling.countDocuments({ status: 'pending' }),
    ContactMessage.countDocuments({ handled: false }),
    Application.countDocuments(),
    Lead.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const claims = await Institution.countDocuments({ 'claimRequest.user': { $ne: null }, owner: null });
  res.json({
    users: Object.fromEntries(usersByRole.map((u) => [u._id, u.n])),
    institutions: Object.fromEntries(instByStatus.map((u) => [u._id, u.n])),
    leads,
    leads30,
    pendingReviews,
    pendingSpots,
    liveSpots,
    pendingCounselling: counselling,
    unreadMessages: messages,
    applications,
    claims,
    daily,
  });
});

// Institutions
router.get('/institutions', async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.claims === '1') Object.assign(filter, { owner: null, 'claimRequest.user': { $ne: null } });
  if (req.query.q) filter.$or = [{ name: rx(req.query.q) }, { 'address.city': rx(req.query.q) }];
  const [items, total] = await Promise.all([
    Institution.find(filter).populate('owner', 'name email phone').populate('claimRequest.user', 'name email phone').sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Institution.countDocuments(filter),
  ]);
  res.json({ items: items.map((i) => ({ ...i.toObject(), id: String(i._id), completeness: profileCompleteness(i) })), total, page, pages: Math.ceil(total / limit) });
});

router.get('/institutions/:id', async (req, res) => {
  const inst = await Institution.findById(req.params.id).populate('owner', 'name email phone');
  if (!inst) throw new HttpError(404, 'Institution not found');
  res.json({ institution: { ...inst.toObject(), id: String(inst._id), completeness: profileCompleteness(inst) } });
});

router.post('/institutions', async (req, res) => {
  const data = institutionBody.parse(req.body);
  const inst = await Institution.create({ ...data, slug: await uniqueSlug(data.name, data.address?.city), status: 'approved', reviewedAt: new Date() });
  await audit(req, 'institution.create', inst._id, { name: inst.name });
  res.status(201).json({ institution: inst });
});

router.put('/institutions/:id', async (req, res) => {
  const inst = await Institution.findById(req.params.id);
  if (!inst) throw new HttpError(404, 'Institution not found');
  const data = institutionBody.partial().parse(req.body);
  if (data.name && data.name !== inst.name) inst.slug = await uniqueSlug(data.name, data.address?.city || inst.address?.city, inst._id);
  inst.set(data);
  await inst.save();
  await audit(req, 'institution.update', inst._id);
  res.json({ institution: inst });
});

router.patch('/institutions/:id/status', async (req, res) => {
  const { status, remarks } = z.object({ status: z.enum(INSTITUTION_STATUS), remarks: z.string().max(1000).optional() }).parse(req.body);
  if (status === 'rejected' && !remarks) throw new HttpError(400, 'Please add remarks so the institution knows what to fix');
  const inst = await Institution.findById(req.params.id);
  if (!inst) throw new HttpError(404, 'Institution not found');
  inst.status = status;
  inst.reviewRemarks = remarks;
  inst.reviewedAt = new Date();
  await inst.save();
  await notifyUser(inst.owner, `Listing ${status}: ${inst.name}`, remarks || '', '/institution');
  await audit(req, 'institution.status', inst._id, { status, remarks });
  res.json({ institution: inst });
});

router.patch('/institutions/:id/flags', async (req, res) => {
  const flags = z.object({ isVerified: z.boolean().optional(), isFeatured: z.boolean().optional() }).parse(req.body);
  const inst = await Institution.findByIdAndUpdate(req.params.id, { $set: flags }, { new: true });
  if (!inst) throw new HttpError(404, 'Institution not found');
  await audit(req, 'institution.flags', inst._id, flags);
  res.json({ institution: inst });
});

router.patch('/institutions/:id/claim', async (req, res) => {
  const { approve } = z.object({ approve: z.boolean() }).parse(req.body);
  const inst = await Institution.findById(req.params.id);
  if (!inst?.claimRequest?.user) throw new HttpError(404, 'No claim request');
  const claimant = inst.claimRequest.user;
  if (approve) {
    inst.owner = claimant;
    await User.updateOne({ _id: claimant, role: 'student' }, { $set: { role: 'institution' } });
  }
  inst.claimRequest = undefined;
  await inst.save();
  await notifyUser(claimant, approve ? `Claim approved: ${inst.name}` : `Claim rejected: ${inst.name}`, '', '/institution');
  await audit(req, 'institution.claim', inst._id, { approve });
  res.json({ institution: inst });
});

router.delete('/institutions/:id', async (req, res) => {
  const inst = await Institution.findByIdAndDelete(req.params.id);
  if (!inst) throw new HttpError(404, 'Institution not found');
  await Promise.all([SpotAdmission.deleteMany({ institution: inst._id }), Review.deleteMany({ institution: inst._id })]);
  await audit(req, 'institution.delete', inst._id, { name: inst.name });
  res.json({ ok: true });
});

// Leads
function adminLeadFilter(q) {
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.institution && isId(q.institution)) filter.institution = q.institution;
  if (q.q) filter.$or = [{ name: rx(q.q) }, { phone: rx(q.q) }, { email: rx(q.q) }, { course: rx(q.q) }];
  return filter;
}

router.get('/leads', async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 25, maxLimit: 200 });
  const filter = adminLeadFilter(req.query);
  const [items, total] = await Promise.all([
    Lead.find(filter).populate('institution', 'name slug').sort({ lastEnquiryAt: -1 }).skip(skip).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

router.get('/leads.csv', async (req, res) => {
  const items = await Lead.find(adminLeadFilter(req.query)).populate('institution', 'name').sort({ lastEnquiryAt: -1 }).lean();
  sendCsv(res, 'leads', items, [
    { label: 'Institution', value: (l) => l.institution?.name },
    { label: 'Name', value: 'name' },
    { label: 'Phone', value: 'phone' },
    { label: 'Email', value: 'email' },
    { label: 'Course', value: 'course' },
    { label: 'Source', value: 'source' },
    { label: 'Status', value: 'status' },
    { label: 'Created', value: 'createdAt' },
  ]);
});

router.patch('/leads/:id', async (req, res) => {
  const { status, institution } = z.object({ status: z.enum(LEAD_STATUS).optional(), institution: z.string().refine(isId).optional() }).parse(req.body);
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (status) lead.status = status;
  if (institution) lead.institution = institution;
  lead.notes.push({ text: `Admin: ${status ? `status → ${status}` : ''} ${institution ? 'reassigned' : ''}`.trim(), by: req.user.name });
  await lead.save();
  await audit(req, 'lead.update', lead._id, { status, institution });
  res.json({ lead });
});

// Reviews
router.get('/reviews', async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json({ items: await Review.find(filter).populate('institution', 'name slug').populate('user', 'name email phone').sort({ createdAt: -1 }).limit(200).lean() });
});

router.patch('/reviews/:id', async (req, res) => {
  const { status } = z.object({ status: z.enum(['pending', 'approved', 'rejected']) }).parse(req.body);
  const review = await Review.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
  if (!review) throw new HttpError(404, 'Review not found');
  await recomputeRating(review.institution);
  await notifyUser(review.user, `Your review was ${status}`, review.title || '', '/student/reviews');
  await audit(req, 'review.status', review._id, { status });
  res.json({ review });
});

// Spot admissions
router.get('/spot-admissions', async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const [items, alerts] = await Promise.all([
    SpotAdmission.find(filter).populate('institution', 'name slug address.city').sort({ createdAt: -1 }).limit(200).lean(),
    SpotAlert.countDocuments({ active: true }),
  ]);
  res.json({ items, alertSubscribers: alerts });
});

router.patch('/spot-admissions/:id', async (req, res) => {
  const { status } = z.object({ status: z.enum(['pending', 'live', 'closed', 'rejected']) }).parse(req.body);
  const spot = await SpotAdmission.findById(req.params.id).populate('institution', 'name owner');
  if (!spot) throw new HttpError(404, 'Not found');
  const wasLive = spot.status === 'live';
  spot.status = status;
  await spot.save();
  let alerted = 0;
  if (status === 'live' && !wasLive) alerted = await alertSubscribers(spot, spot.institution?.name || '');
  await notifyUser(spot.institution?.owner, `Spot admission ${status}`, spot.courseName, '/institution/spot');
  await audit(req, 'spot.status', spot._id, { status });
  res.json({ spot, alerted });
});

// Content (articles, news, podcasts, virtual tours, exams)
const contentBody = z.object({
  kind: z.enum(CONTENT_KINDS),
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().max(500).optional(),
  body: z.string().max(50000).optional(),
  cover: z.string().max(300).optional(),
  mediaUrl: z.string().max(500).optional(),
  category: z.string().max(60).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  institution: z.string().refine(isId).optional().or(z.literal('')),
  published: z.boolean().default(false),
});

async function contentSlug(title, excludeId) {
  const base = slugify(title) || 'post';
  let slug = base;
  for (let n = 2; await Content.exists({ slug, _id: { $ne: excludeId } }); n += 1) slug = `${base}-${n}`;
  return slug;
}

router.get('/content', async (req, res) => {
  const filter = req.query.kind ? { kind: req.query.kind } : {};
  res.json({ items: await Content.find(filter).select('-body').sort({ updatedAt: -1 }).limit(300).lean() });
});

router.get('/content/:id', async (req, res) => {
  const item = await Content.findById(req.params.id).lean();
  if (!item) throw new HttpError(404, 'Not found');
  res.json({ item });
});

router.post('/content', async (req, res) => {
  const data = contentBody.parse(req.body);
  const item = await Content.create({
    ...data,
    institution: data.institution || undefined,
    slug: await contentSlug(data.title),
    author: req.user._id,
    publishedAt: data.published ? new Date() : undefined,
  });
  res.status(201).json({ item });
});

router.put('/content/:id', async (req, res) => {
  const item = await Content.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Not found');
  const data = contentBody.partial().parse(req.body);
  if (data.title && data.title !== item.title) item.slug = await contentSlug(data.title, item._id);
  if (data.published && !item.publishedAt) item.publishedAt = new Date();
  item.set({ ...data, institution: data.institution || undefined });
  await item.save();
  res.json({ item });
});

router.delete('/content/:id', async (req, res) => {
  await Content.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Testimonials
const testimonialBody = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.string().max(100).optional(),
  quote: z.string().trim().min(5).max(2000),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  videoUrl: z.string().max(300).optional(),
  photo: z.string().max(300).optional(),
  published: z.boolean().default(true),
  order: z.coerce.number().int().default(0),
});

router.get('/testimonials', async (_req, res) => res.json({ items: await Testimonial.find().sort({ order: 1, createdAt: -1 }).lean() }));
router.post('/testimonials', async (req, res) => res.status(201).json({ item: await Testimonial.create(testimonialBody.parse(req.body)) }));
router.put('/testimonials/:id', async (req, res) => {
  const item = await Testimonial.findByIdAndUpdate(req.params.id, { $set: testimonialBody.partial().parse(req.body) }, { new: true });
  if (!item) throw new HttpError(404, 'Not found');
  res.json({ item });
});
router.delete('/testimonials/:id', async (req, res) => {
  await Testimonial.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Counselling requests
function counsellingFilter(q) {
  const filter = {};
  if (q.type) filter.type = q.type;
  if (q.status) filter.status = q.status;
  if (q.q) filter.$or = [{ name: rx(q.q) }, { phone: rx(q.q) }, { email: rx(q.q) }];
  return filter;
}

router.get('/counselling', async (req, res) => {
  res.json({ items: await Counselling.find(counsellingFilter(req.query)).populate('assignedTo', 'name').sort({ createdAt: -1 }).limit(500).lean() });
});

router.get('/counselling.csv', async (req, res) => {
  const items = await Counselling.find(counsellingFilter(req.query)).sort({ createdAt: -1 }).lean();
  sendCsv(res, 'counselling', items, [
    { label: 'Type', value: 'type' },
    { label: 'Name', value: 'name' },
    { label: 'Phone', value: 'phone' },
    { label: 'Email', value: 'email' },
    { label: 'Class', value: 'studentClass' },
    { label: 'City', value: 'city' },
    { label: 'Mode', value: 'mode' },
    { label: 'Preferred date', value: 'preferredDate' },
    { label: 'Slot', value: 'preferredSlot' },
    { label: 'Status', value: 'status' },
    { label: 'Message', value: 'message' },
    { label: 'Created', value: 'createdAt' },
  ]);
});

router.patch('/counselling/:id', async (req, res) => {
  const data = z
    .object({
      status: z.enum(COUNSELLING_STATUS).optional(),
      assignedTo: z.string().refine(isId).optional().or(z.literal('')),
      meetingLink: z.string().max(300).optional(),
      counsellorNotes: z.string().max(5000).optional(),
      preferredDate: z.coerce.date().optional(),
      preferredSlot: z.string().max(40).optional(),
    })
    .parse(req.body);
  const item = await Counselling.findByIdAndUpdate(req.params.id, { $set: { ...data, assignedTo: data.assignedTo || undefined } }, { new: true });
  if (!item) throw new HttpError(404, 'Not found');
  if (data.status) await notifyUser(item.student, `Counselling ${data.status}`, item.meetingLink ? `Join: ${item.meetingLink}` : '', '/student/counselling');
  res.json({ item });
});

router.delete('/counselling/:id', async (req, res) => {
  await Counselling.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Contact messages
router.get('/messages', async (_req, res) => res.json({ items: await ContactMessage.find().sort({ createdAt: -1 }).limit(500).lean() }));
router.patch('/messages/:id', async (req, res) => {
  const { handled } = z.object({ handled: z.boolean() }).parse(req.body);
  res.json({ item: await ContactMessage.findByIdAndUpdate(req.params.id, { $set: { handled } }, { new: true }) });
});

// Users
router.get('/users', async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 25, maxLimit: 200 });
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) filter.$or = [{ name: rx(req.query.q) }, { email: rx(req.query.q) }, { phone: rx(req.query.q) }];
  const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)]);
  res.json({ items: items.map((u) => ({ ...u.toPublic(), active: u.active, lastLoginAt: u.lastLoginAt })), total, page, pages: Math.ceil(total / limit) });
});

router.patch('/users/:id', async (req, res) => {
  const data = z.object({ role: z.enum(['student', 'institution', 'counsellor', 'admin']).optional(), active: z.boolean().optional() }).parse(req.body);
  if (String(req.params.id) === String(req.user._id)) throw new HttpError(400, 'You cannot change your own role or status');
  const user = await User.findByIdAndUpdate(req.params.id, { $set: data }, { new: true });
  if (!user) throw new HttpError(404, 'User not found');
  await audit(req, 'user.update', user._id, data);
  res.json({ user: { ...user.toPublic(), active: user.active } });
});

// Master data
const masterBody = z.object({
  kind: z.enum(MASTER_KINDS),
  name: z.string().trim().min(1).max(100),
  meta: z.object({ icon: z.string().max(40).optional(), appliesTo: z.string().max(40).optional(), state: z.string().max(60).optional() }).optional(),
  order: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
});

router.get('/master', async (req, res) => {
  const filter = req.query.kind ? { kind: req.query.kind } : {};
  res.json({ items: await MasterData.find(filter).sort({ kind: 1, order: 1, name: 1 }).lean(), kinds: MASTER_KINDS });
});

router.post('/master', async (req, res) => {
  const data = masterBody.parse(req.body);
  const slug = slugify(data.name);
  if (await MasterData.exists({ kind: data.kind, slug })) throw new HttpError(409, `${data.name} already exists`);
  res.status(201).json({ item: await MasterData.create({ ...data, slug }) });
});

router.put('/master/:id', async (req, res) => {
  const data = masterBody.partial().parse(req.body);
  const update = data.name ? { ...data, slug: slugify(data.name) } : data;
  const item = await MasterData.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!item) throw new HttpError(404, 'Not found');
  res.json({ item });
});

router.delete('/master/:id', async (req, res) => {
  await MasterData.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.get('/applications', async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json({ items: await Application.find(filter).populate('institution', 'name slug').sort({ createdAt: -1 }).limit(300).lean() });
});

router.get('/audit', async (_req, res) => {
  res.json({ items: await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(200).lean() });
});

export default router;
