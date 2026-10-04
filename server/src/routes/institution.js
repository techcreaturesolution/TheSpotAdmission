import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Application, APPLICATION_STATUS } from '../models/Application.js';
import { Institution, INSTITUTION_TYPES, OWNERSHIP } from '../models/Institution.js';
import { Lead, LEAD_STATUS } from '../models/Lead.js';
import { Review } from '../models/Review.js';
import { SpotAdmission } from '../models/SpotAdmission.js';
import { CRITICAL_FIELDS, feeRangeFromCourses, profileCompleteness } from '../services/institutions.js';
import { notifyAdmins, notifyUser } from '../services/notify.js';
import { alertSubscribers, confirmSpotSeat } from '../services/spot.js';
import { HttpError } from '../utils/httpError.js';
import { escapeRegex, slugify, toCsv } from '../utils/text.js';

const router = Router();
const isId = (v) => mongoose.isValidObjectId(v);
const optStr = (max = 200) => z.string().trim().max(max).optional();
const optNum = z.coerce.number().min(0).optional();

export const institutionBody = z.object({
  name: z.string().trim().min(3).max(150),
  type: z.enum(INSTITUTION_TYPES),
  category: optStr(60),
  ownership: z.enum(OWNERSHIP).optional(),
  board: optStr(80),
  university: optStr(120),
  about: optStr(5000),
  logo: optStr(300),
  cover: optStr(300),
  gallery: z.array(z.string().max(300)).max(30).optional(),
  brochure: optStr(300),
  virtualTourUrl: optStr(300),
  contact: z.object({ phone: optStr(20), email: optStr(120), website: optStr(200) }).optional(),
  address: z
    .object({ line: optStr(300), city: optStr(60), district: optStr(60), state: optStr(60), pincode: optStr(10), lat: z.coerce.number().optional(), lng: z.coerce.number().optional() })
    .optional(),
  facilities: z.array(z.string().trim().max(60)).max(40).optional(),
  accreditation: z.array(z.string().trim().max(60)).max(20).optional(),
  establishedYear: z.coerce.number().int().min(1800).max(2100).optional(),
  fees: z.object({ min: optNum, max: optNum }).optional(),
  placements: z.object({ highestLpa: optNum, averageLpa: optNum, recruiters: z.array(z.string().max(60)).max(40).optional() }).optional(),
  hostel: z.boolean().optional(),
  transport: z.boolean().optional(),
  scholarships: optStr(2000),
  faqs: z.array(z.object({ q: z.string().max(300), a: z.string().max(2000) })).max(30).optional(),
  seo: z.object({ title: optStr(120), description: optStr(300) }).optional(),
});

export const courseBody = z.object({
  name: z.string().trim().min(2).max(120),
  level: optStr(60),
  stream: optStr(60),
  duration: optStr(40),
  eligibility: optStr(500),
  feesPerYear: optNum,
  seatsTotal: z.coerce.number().int().min(0).default(0),
  seatsVacant: z.coerce.number().int().min(0).default(0),
  mode: z.enum(['full-time', 'part-time', 'online', 'distance']).default('full-time'),
  admissionProcess: optStr(2000),
});

export async function uniqueSlug(name, city, excludeId) {
  const base = slugify([name, city].filter(Boolean).join(' ')) || 'institution';
  let slug = base;
  for (let n = 2; await Institution.exists({ slug, _id: { $ne: excludeId } }); n += 1) slug = `${base}-${n}`;
  return slug;
}

async function owned(req) {
  if (!isId(req.params.id)) throw new HttpError(404, 'Institution not found');
  const inst = await Institution.findOne({ _id: req.params.id, owner: req.user._id });
  if (!inst) throw new HttpError(404, 'Institution not found');
  return inst;
}

async function ownedLead(req) {
  const lead = await Lead.findById(req.params.leadId);
  if (!lead || !(await Institution.exists({ _id: lead.institution, owner: req.user._id }))) throw new HttpError(404, 'Lead not found');
  return lead;
}

const full = (inst) => ({ ...inst.toObject(), id: String(inst._id), completeness: profileCompleteness(inst) });

router.get('/', async (req, res) => {
  const items = await Institution.find({ owner: req.user._id }).sort({ createdAt: 1 });
  res.json({ items: items.map(full) });
});

router.post('/', async (req, res) => {
  const data = institutionBody.parse(req.body);
  const inst = await Institution.create({ ...data, slug: await uniqueSlug(data.name, data.address?.city), owner: req.user._id, status: 'draft' });
  res.status(201).json({ institution: full(inst) });
});

router.get('/claimable', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.json({ items: [] });
  const items = await Institution.find({ owner: null, status: 'approved', name: new RegExp(escapeRegex(q), 'i') }).select('name slug address.city type').limit(10).lean();
  res.json({ items });
});

router.post('/claim/:id', async (req, res) => {
  const { note } = z.object({ note: z.string().max(500).optional() }).parse(req.body || {});
  const inst = await Institution.findOne({ _id: req.params.id, owner: null });
  if (!inst) throw new HttpError(404, 'Listing not found or already claimed');
  inst.claimRequest = { user: req.user._id, note, at: new Date() };
  await inst.save();
  await notifyAdmins(`Claim request for ${inst.name}`, `${req.user.name} (${req.user.email || req.user.phone})`, '/admin/institutions?claims=1');
  res.json({ ok: true, message: 'Claim request sent. The admin team will verify and contact you.' });
});

router.get('/:id', async (req, res) => res.json({ institution: full(await owned(req)) }));

router.put('/:id', async (req, res) => {
  const inst = await owned(req);
  const data = institutionBody.partial().parse(req.body);
  const criticalChanged = CRITICAL_FIELDS.some((f) => f in data && JSON.stringify(data[f]) !== JSON.stringify(inst.toObject()[f]));
  if (data.name && data.name !== inst.name) inst.slug = await uniqueSlug(data.name, data.address?.city || inst.address?.city, inst._id);
  inst.set(data);
  if (inst.status === 'approved' && criticalChanged) {
    inst.status = 'pending';
    await notifyAdmins(`Re-review: ${inst.name}`, 'Critical fields changed after approval', '/admin/institutions?status=pending');
  }
  await inst.save();
  res.json({ institution: full(inst), sentForReview: inst.status === 'pending' && criticalChanged });
});

router.post('/:id/submit', async (req, res) => {
  const inst = await owned(req);
  if (!['draft', 'rejected'].includes(inst.status)) throw new HttpError(400, `Listing is already ${inst.status}`);
  const { percent, missing } = profileCompleteness(inst);
  if (percent < 50) throw new HttpError(400, `Complete at least 50% of your profile before submitting. Missing: ${missing.join(', ')}`);
  inst.status = 'pending';
  await inst.save();
  await notifyAdmins(`Listing submitted: ${inst.name}`, `${inst.type} · ${inst.address?.city || ''}`, '/admin/institutions?status=pending');
  res.json({ institution: full(inst) });
});

const syncFees = (inst) => {
  const range = feeRangeFromCourses(inst.courses);
  if (range) inst.fees = range;
};

router.post('/:id/courses', async (req, res) => {
  const inst = await owned(req);
  const course = courseBody.parse(req.body);
  if (course.seatsVacant > course.seatsTotal) course.seatsVacant = course.seatsTotal;
  inst.courses.push(course);
  syncFees(inst);
  await inst.save();
  res.status(201).json({ institution: full(inst) });
});

router.put('/:id/courses/:courseId', async (req, res) => {
  const inst = await owned(req);
  const course = inst.courses.id(req.params.courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  const data = courseBody.partial().parse(req.body);
  course.set(data);
  if (course.seatsVacant > course.seatsTotal) course.seatsVacant = course.seatsTotal;
  syncFees(inst);
  await inst.save();
  res.json({ institution: full(inst) });
});

router.delete('/:id/courses/:courseId', async (req, res) => {
  const inst = await owned(req);
  inst.courses.pull(req.params.courseId);
  syncFees(inst);
  await inst.save();
  res.json({ institution: full(inst) });
});

function leadFilter(inst, q) {
  const filter = { institution: inst._id };
  if (q.status) filter.status = q.status;
  if (q.source) filter.source = q.source;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { course: rx }];
  }
  return filter;
}

router.get('/:id/leads', async (req, res) => {
  const inst = await owned(req);
  const items = await Lead.find(leadFilter(inst, req.query)).sort({ lastEnquiryAt: -1 }).limit(500).lean();
  res.json({ items });
});

router.get('/:id/leads.csv', async (req, res) => {
  const inst = await owned(req);
  const items = await Lead.find(leadFilter(inst, req.query)).sort({ lastEnquiryAt: -1 }).lean();
  const csv = toCsv(items, [
    { label: 'Name', value: 'name' },
    { label: 'Phone', value: 'phone' },
    { label: 'Email', value: 'email' },
    { label: 'City', value: 'city' },
    { label: 'Course', value: 'course' },
    { label: 'Source', value: 'source' },
    { label: 'Status', value: 'status' },
    { label: 'Enquiries', value: 'enquiryCount' },
    { label: 'Message', value: 'message' },
    { label: 'Created', value: 'createdAt' },
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${inst.slug}-leads.csv"`);
  res.send(csv);
});

router.patch('/leads/:leadId', async (req, res) => {
  const lead = await ownedLead(req);
  const { status, note } = z.object({ status: z.enum(LEAD_STATUS).optional(), note: z.string().trim().max(1000).optional() }).parse(req.body);
  if (status && status !== lead.status) {
    lead.status = status;
    lead.notes.push({ text: `Status → ${status}`, by: req.user.name });
    await notifyUser(lead.student, `Enquiry update: ${status}`, `Your enquiry status changed to ${status}`, '/student/enquiries');
  }
  if (note) lead.notes.push({ text: note, by: req.user.name });
  await lead.save();
  res.json({ lead });
});

router.get('/:id/analytics', async (req, res) => {
  const inst = await owned(req);
  const since = new Date(Date.now() - 30 * 86400_000);
  const [byStatus, daily, applications, reviews] = await Promise.all([
    Lead.aggregate([{ $match: { institution: inst._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Lead.aggregate([
      { $match: { institution: inst._id, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Application.countDocuments({ institution: inst._id }),
    Review.countDocuments({ institution: inst._id, status: 'approved' }),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.n]));
  const total = byStatus.reduce((s, x) => s + x.n, 0);
  res.json({
    views: inst.views,
    leads: total,
    leadsByStatus: counts,
    conversion: total ? Math.round(((counts.admitted || 0) / total) * 1000) / 10 : 0,
    daily,
    applications,
    reviews,
    rating: inst.rating,
    completeness: profileCompleteness(inst),
  });
});

const spotBody = z.object({
  courseName: z.string().trim().min(2).max(120),
  vacantSeats: z.coerce.number().int().min(1).max(10000),
  round: optStr(60),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date(),
  notice: optStr(2000),
  documentsRequired: z.array(z.string().trim().max(100)).max(20).default([]),
});

router.get('/:id/spot-admissions', async (req, res) => {
  const inst = await owned(req);
  res.json({ items: await SpotAdmission.find({ institution: inst._id }).sort({ createdAt: -1 }).lean() });
});

router.post('/:id/spot-admissions', async (req, res) => {
  const inst = await owned(req);
  if (inst.status !== 'approved') throw new HttpError(400, 'Your listing must be approved before posting spot admissions');
  const data = spotBody.parse(req.body);
  if (data.endDate < new Date()) throw new HttpError(400, 'Last date must be in the future');
  const live = inst.isVerified;
  const spot = await SpotAdmission.create({ ...data, institution: inst._id, city: inst.address?.city, status: live ? 'live' : 'pending' });
  if (live) await alertSubscribers(spot, inst.name);
  else await notifyAdmins(`Spot admission to review: ${inst.name}`, `${data.courseName} · ${data.vacantSeats} seats`, '/admin/spot-admissions');
  res.status(201).json({ spot, autoPublished: live });
});

async function ownedSpot(req) {
  const spot = await SpotAdmission.findById(req.params.spotId);
  if (!spot || !(await Institution.exists({ _id: spot.institution, owner: req.user._id }))) throw new HttpError(404, 'Spot admission not found');
  return spot;
}

router.patch('/spot/:spotId', async (req, res) => {
  const spot = await ownedSpot(req);
  const data = spotBody.partial().extend({ close: z.boolean().optional() }).parse(req.body);
  const { close, ...rest } = data;
  spot.set(rest);
  if (close) spot.status = 'closed';
  await spot.save();
  res.json({ spot });
});

router.post('/spot/:spotId/confirm', async (req, res) => {
  await ownedSpot(req);
  const spot = await confirmSpotSeat(req.params.spotId);
  if (!spot) throw new HttpError(409, 'No vacant seats left or this spot admission is not live');
  res.json({ spot });
});

router.get('/:id/applications', async (req, res) => {
  const inst = await owned(req);
  const filter = { institution: inst._id };
  if (req.query.status) filter.status = req.query.status;
  res.json({ items: await Application.find(filter).sort({ createdAt: -1 }).lean() });
});

router.patch('/applications/:appId', async (req, res) => {
  const app = await Application.findById(req.params.appId);
  if (!app || !(await Institution.exists({ _id: app.institution, owner: req.user._id }))) throw new HttpError(404, 'Application not found');
  const { status, note } = z.object({ status: z.enum(APPLICATION_STATUS), note: z.string().max(500).optional() }).parse(req.body);
  if (app.status === 'withdrawn') throw new HttpError(400, 'Student has withdrawn this application');
  app.status = status;
  app.timeline.push({ status, note });
  await app.save();
  await notifyUser(app.student, `Application ${status}`, `${app.courseName}: ${note || status}`, '/student/applications');
  res.json({ application: app });
});

router.get('/:id/reviews', async (req, res) => {
  const inst = await owned(req);
  res.json({ items: await Review.find({ institution: inst._id, status: 'approved' }).populate('user', 'name').sort({ createdAt: -1 }).lean() });
});

export { isId };
export default router;
