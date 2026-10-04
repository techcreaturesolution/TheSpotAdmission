import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { formLimiter } from '../middleware/rateLimit.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { Content, CONTENT_KINDS } from '../models/Content.js';
import { Counselling, COUNSELLING_TYPES } from '../models/Counselling.js';
import { Institution, INSTITUTION_TYPES, OWNERSHIP } from '../models/Institution.js';
import { Lead } from '../models/Lead.js';
import { MasterData } from '../models/MasterData.js';
import { Review } from '../models/Review.js';
import { SpotAdmission } from '../models/SpotAdmission.js';
import { SpotAlert } from '../models/SpotAlert.js';
import { Testimonial } from '../models/Testimonial.js';
import { User } from '../models/User.js';
import { PUBLIC_CARD_FIELDS, toCard } from '../services/institutions.js';
import { createOrMergeLead } from '../services/leads.js';
import { notifyAdmins } from '../services/notify.js';
import { verifyOtp } from '../services/otp.js';
import { closeExpiredSpots } from '../services/spot.js';
import { HttpError } from '../utils/httpError.js';
import { escapeRegex, isIndianMobile, normalizePhone, paginate } from '../utils/text.js';

const router = Router();
const approved = { status: 'approved' };
const isId = (v) => mongoose.isValidObjectId(v);

router.get('/meta', async (_req, res) => {
  const [master, cities, stats] = await Promise.all([
    MasterData.find({ active: true }).sort({ order: 1, name: 1 }).lean(),
    Institution.distinct('address.city', approved),
    Promise.all([
      Institution.countDocuments(approved),
      Institution.countDocuments({ ...approved, type: { $in: ['school', 'preschool'] } }),
      Lead.countDocuments({}),
      SpotAdmission.countDocuments({ status: 'live' }),
    ]),
  ]);
  const by = (kind) => master.filter((m) => m.kind === kind).map((m) => ({ name: m.name, slug: m.slug, meta: m.meta }));
  res.json({
    types: INSTITUTION_TYPES,
    ownership: OWNERSHIP,
    counsellingTypes: COUNSELLING_TYPES,
    contentKinds: CONTENT_KINDS,
    categories: by('category'),
    boards: by('board'),
    universities: by('university'),
    facilities: by('facility'),
    streams: by('stream'),
    cities: [...new Set([...by('city').map((c) => c.name), ...cities.filter(Boolean)])].sort(),
    stats: { institutions: stats[0], schools: stats[1], enquiries: stats[2], liveSpots: stats[3] },
  });
});

function listingFilter(q) {
  const filter = { ...approved };
  if (q.type) filter.type = { $in: String(q.type).split(',') };
  if (q.category) filter.category = new RegExp(`^${escapeRegex(q.category)}$`, 'i');
  if (q.city) filter['address.city'] = new RegExp(`^${escapeRegex(q.city)}$`, 'i');
  if (q.ownership) filter.ownership = { $in: String(q.ownership).split(',') };
  if (q.board) filter.$or = [{ board: new RegExp(escapeRegex(q.board), 'i') }, { university: new RegExp(escapeRegex(q.board), 'i') }];
  if (q.course) filter['courses.name'] = new RegExp(escapeRegex(q.course), 'i');
  if (q.facility) filter.facilities = { $all: String(q.facility).split(',') };
  if (q.minRating) filter['rating.avg'] = { $gte: Number(q.minRating) };
  if (q.maxFee) filter['fees.min'] = { $lte: Number(q.maxFee) };
  if (q.minFee) filter['fees.max'] = { $gte: Number(q.minFee) };
  if (q.hostel === 'true') filter.hostel = true;
  if (q.verified === 'true') filter.isVerified = true;
  if (q.q) {
    const rx = new RegExp(escapeRegex(String(q.q).trim()), 'i');
    filter.$and = [{ $or: [{ name: rx }, { 'courses.name': rx }, { 'address.city': rx }, { category: rx }, { board: rx }, { university: rx }] }];
  }
  return filter;
}

const SORTS = {
  relevance: { isFeatured: -1, isVerified: -1, 'rating.avg': -1, views: -1 },
  rating: { 'rating.avg': -1, 'rating.count': -1 },
  'fees-asc': { 'fees.min': 1 },
  'fees-desc': { 'fees.max': -1 },
  newest: { createdAt: -1 },
  name: { name: 1 },
};

router.get('/institutions', async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = listingFilter(req.query);
  const sort = SORTS[req.query.sort] || SORTS.relevance;
  const [items, total] = await Promise.all([
    Institution.find(filter).select(PUBLIC_CARD_FIELDS).sort(sort).skip(skip).limit(limit).lean(),
    Institution.countDocuments(filter),
  ]);
  res.json({ items: items.map(toCard), total, page, pages: Math.ceil(total / limit) });
});

router.get('/institutions/featured', async (_req, res) => {
  const items = await Institution.find({ ...approved, isFeatured: true }).select(PUBLIC_CARD_FIELDS).sort({ 'rating.avg': -1 }).limit(8).lean();
  const fallback = items.length ? [] : await Institution.find(approved).select(PUBLIC_CARD_FIELDS).sort(SORTS.relevance).limit(8).lean();
  res.json({ items: [...items, ...fallback].map(toCard) });
});

router.get('/institutions/:slug', async (req, res) => {
  const inst = await Institution.findOneAndUpdate({ slug: req.params.slug, ...approved }, { $inc: { views: 1 } }, { new: true })
    .select('-claimRequest -reviewRemarks')
    .lean();
  if (!inst) throw new HttpError(404, 'Institution not found');
  const [reviews, similar, spots] = await Promise.all([
    Review.find({ institution: inst._id, status: 'approved' }).populate('user', 'name').sort({ createdAt: -1 }).limit(20).lean(),
    Institution.find({ ...approved, _id: { $ne: inst._id }, type: inst.type, 'address.city': inst.address?.city })
      .select(PUBLIC_CARD_FIELDS)
      .sort(SORTS.relevance)
      .limit(4)
      .lean(),
    SpotAdmission.find({ institution: inst._id, status: 'live', endDate: { $gte: new Date() } }).lean(),
  ]);
  const { owner, ...rest } = inst;
  res.json({
    institution: { ...rest, id: String(inst._id), claimed: Boolean(owner) },
    reviews: reviews.map((r) => ({ id: String(r._id), rating: r.rating, title: r.title, body: r.body, relation: r.relation, user: r.user?.name || 'Student', createdAt: r.createdAt })),
    similar: similar.map(toCard),
    spotAdmissions: spots,
  });
});

router.get('/search/suggest', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ institutions: [], courses: [], cities: [] });
  const rx = new RegExp(escapeRegex(q), 'i');
  const [institutions, courses, cities] = await Promise.all([
    Institution.find({ ...approved, name: rx }).select('slug name type address.city').limit(6).lean(),
    Institution.aggregate([{ $match: approved }, { $unwind: '$courses' }, { $match: { 'courses.name': rx } }, { $group: { _id: '$courses.name' } }, { $limit: 5 }]),
    Institution.distinct('address.city', { ...approved, 'address.city': rx }),
  ]);
  res.json({
    institutions: institutions.map((i) => ({ slug: i.slug, name: i.name, type: i.type, city: i.address?.city })),
    courses: courses.map((c) => c._id),
    cities: cities.slice(0, 5),
  });
});

router.get('/compare', async (req, res) => {
  const ids = String(req.query.ids || '')
    .split(',')
    .filter(isId)
    .slice(0, 4);
  if (!ids.length) return res.json({ items: [] });
  const items = await Institution.find({ _id: { $in: ids }, ...approved }).select('-claimRequest -reviewRemarks -owner -gallery -faqs').lean();
  const order = new Map(ids.map((id, i) => [id, i]));
  items.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));
  res.json({ items: items.map((i) => ({ ...i, id: String(i._id) })) });
});

router.get('/spot-admissions', async (req, res) => {
  await closeExpiredSpots();
  const filter = { status: 'live', endDate: { $gte: new Date() }, vacantSeats: { $gt: 0 } };
  if (req.query.city) filter.city = new RegExp(`^${escapeRegex(req.query.city)}$`, 'i');
  if (req.query.course) filter.courseName = new RegExp(escapeRegex(req.query.course), 'i');
  if (req.query.before) filter.endDate.$lte = new Date(req.query.before);
  const items = await SpotAdmission.find(filter).populate('institution', 'name slug type address.city logo isVerified').sort({ endDate: 1 }).limit(100).lean();
  res.json({ items: items.filter((s) => s.institution) });
});

const verifyPhone = async (req, phone, purpose, code) => {
  const normalized = normalizePhone(phone);
  if (!isIndianMobile(normalized)) throw new HttpError(400, 'Enter a valid 10-digit Indian mobile number');
  if (req.user?.phoneVerified && req.user.phone === normalized) return normalized;
  if (!code) throw new HttpError(400, 'OTP is required to verify your mobile number', { needsOtp: true });
  return verifyOtp(normalized, purpose, code);
};

const alertSchema = z.object({
  name: z.string().trim().max(100).optional(),
  phone: z.string().min(10),
  code: z.string().optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  city: z.string().trim().max(60).optional(),
  course: z.string().trim().max(100).optional(),
});

router.post('/spot-alerts', formLimiter, optionalAuth, async (req, res) => {
  const data = alertSchema.parse(req.body);
  const phone = await verifyPhone(req, data.phone, 'spot-alert', data.code);
  const alert = await SpotAlert.findOneAndUpdate(
    { phone, city: data.city || '', course: data.course || '' },
    { $set: { name: data.name, email: data.email || undefined, active: true, user: req.user?._id } },
    { upsert: true, new: true },
  );
  res.status(201).json({ ok: true, id: alert._id });
});

const leadSchema = z.object({
  institutionId: z.string().refine(isId, 'Invalid institution'),
  name: z.string().trim().min(2).max(100),
  phone: z.string().min(10),
  code: z.string().optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  city: z.string().trim().max(60).optional(),
  course: z.string().trim().max(120).optional(),
  message: z.string().trim().max(1000).optional(),
  source: z.enum(['enquiry', 'spot-admission', 'compare', 'brochure']).default('enquiry'),
  spotAdmissionId: z.string().refine(isId).optional(),
  consent: z.literal(true, { message: 'Please agree to share your details with the institution' }),
});

router.post('/leads', formLimiter, optionalAuth, async (req, res) => {
  const data = leadSchema.parse(req.body);
  const phone = await verifyPhone(req, data.phone, 'lead', data.code);
  const { lead, merged, institution } = await createOrMergeLead({
    institutionId: data.institutionId,
    phone,
    name: data.name,
    email: data.email || undefined,
    city: data.city,
    course: data.course,
    message: data.message,
    source: data.source,
    spotAdmission: data.spotAdmissionId,
    student: req.user?.role === 'student' ? req.user._id : undefined,
    consent: data.consent,
  });
  res.status(merged ? 200 : 201).json({
    ok: true,
    merged,
    leadId: lead._id,
    message: merged
      ? `You already enquired at ${institution.name} recently. We've added this to your existing enquiry.`
      : `Your enquiry has been sent to ${institution.name}. They will contact you soon.`,
  });
});

router.get('/content', async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 9 });
  const filter = { published: true };
  if (req.query.kind) filter.kind = { $in: String(req.query.kind).split(',') };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) filter.title = new RegExp(escapeRegex(req.query.q), 'i');
  const [items, total] = await Promise.all([
    Content.find(filter).select('-body').sort({ publishedAt: -1 }).skip(skip).limit(limit).lean(),
    Content.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

router.get('/content/:slug', async (req, res) => {
  const item = await Content.findOneAndUpdate({ slug: req.params.slug, published: true }, { $inc: { views: 1 } }, { new: true })
    .populate('institution', 'name slug')
    .lean();
  if (!item) throw new HttpError(404, 'Not found');
  const related = await Content.find({ kind: item.kind, published: true, _id: { $ne: item._id } }).select('-body').sort({ publishedAt: -1 }).limit(3).lean();
  res.json({ item, related });
});

router.get('/testimonials', async (_req, res) => {
  res.json({ items: await Testimonial.find({ published: true }).sort({ order: 1, createdAt: -1 }).lean() });
});

const counsellingSchema = z.object({
  type: z.enum(COUNSELLING_TYPES),
  name: z.string().trim().min(2).max(100),
  phone: z.string().refine(isIndianMobile, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  studentClass: z.string().trim().max(60).optional(),
  city: z.string().trim().max(60).optional(),
  mode: z.enum(['online', 'in-person', 'phone']).default('online'),
  preferredDate: z.coerce.date().optional(),
  preferredSlot: z.string().max(40).optional(),
  message: z.string().trim().max(2000).optional(),
  details: z.record(z.string(), z.union([z.string().max(1000), z.number(), z.boolean(), z.array(z.string().max(200))])).optional(),
});

router.post('/counselling', formLimiter, optionalAuth, async (req, res) => {
  const data = counsellingSchema.parse(req.body);
  const doc = await Counselling.create({
    ...data,
    phone: normalizePhone(data.phone),
    email: data.email || undefined,
    student: req.user?._id,
  });
  await notifyAdmins(`New ${data.type} counselling request`, `${data.name} · ${data.phone}`, '/admin/counselling');
  res.status(201).json({ ok: true, id: doc._id });
});

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  phone: z.string().trim().max(15).optional(),
  subject: z.string().trim().max(150).optional(),
  service: z.string().trim().max(60).optional(),
  message: z.string().trim().min(5).max(2000),
});

router.post('/contact', formLimiter, async (req, res) => {
  const data = contactSchema.parse(req.body);
  if (!data.email && !data.phone) throw new HttpError(400, 'Please share an email or phone so we can reply');
  await ContactMessage.create({ ...data, email: data.email || undefined });
  await notifyAdmins('New contact message', `${data.name}: ${data.subject || data.message.slice(0, 60)}`, '/admin/messages');
  res.status(201).json({ ok: true });
});

const reviewSchema = z.object({
  institutionId: z.string().refine(isId),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(20, 'Please write at least 20 characters').max(3000),
  relation: z.enum(['student', 'alumni', 'parent']).default('student'),
});

router.post('/reviews', formLimiter, requireAuth, async (req, res) => {
  if (req.user.role !== 'student') throw new HttpError(403, 'Only student/parent accounts can post reviews');
  const data = reviewSchema.parse(req.body);
  if (!(await Institution.exists({ _id: data.institutionId, ...approved }))) throw new HttpError(404, 'Institution not found');
  if (await Review.exists({ institution: data.institutionId, user: req.user._id })) throw new HttpError(409, 'You have already reviewed this institution');
  await Review.create({ ...data, institution: data.institutionId, user: req.user._id });
  await notifyAdmins('Review awaiting moderation', data.title || data.body.slice(0, 60), '/admin/reviews');
  res.status(201).json({ ok: true, message: 'Thanks! Your review will appear after moderation.' });
});

router.get('/stats/public', async (_req, res) => {
  const [students, institutions, counselled] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Institution.countDocuments(approved),
    Counselling.countDocuments({ status: 'completed' }),
  ]);
  res.json({ students, institutions, counselled });
});

export default router;
