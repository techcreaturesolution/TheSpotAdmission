import { env } from '../config/env.js';
import { Institution } from '../models/Institution.js';
import { Lead } from '../models/Lead.js';
import { HttpError } from '../utils/httpError.js';
import { notifyAdmins, notifyUser } from './notify.js';

export async function createOrMergeLead({ institutionId, phone, name, email, city, course, message, source = 'enquiry', spotAdmission, student, consent }) {
  const institution = await Institution.findOne({ _id: institutionId, status: 'approved' }).select('name owner slug');
  if (!institution) throw new HttpError(404, 'Institution not found');
  const since = new Date(Date.now() - env.duplicateLeadHours * 3600_000);
  const existing = await Lead.findOne({ institution: institution._id, phone, lastEnquiryAt: { $gte: since } });
  if (existing) {
    existing.enquiryCount += 1;
    existing.lastEnquiryAt = new Date();
    if (message) existing.notes.push({ text: `Repeat enquiry: ${message}`, by: 'system' });
    if (course && !existing.course) existing.course = course;
    if (student && !existing.student) existing.student = student;
    await existing.save();
    return { lead: existing, merged: true, institution };
  }
  const lead = await Lead.create({
    institution: institution._id,
    phone,
    name,
    email,
    city,
    course,
    message,
    source,
    spotAdmission,
    student,
    consent: Boolean(consent),
    otpVerified: true,
  });
  await notifyUser(institution.owner, `New enquiry from ${name}`, course ? `Course: ${course}` : message, '/institution/leads');
  if (!institution.owner) await notifyAdmins(`New enquiry for unclaimed listing ${institution.name}`, `${name} · ${phone}`, '/admin/leads');
  return { lead, merged: false, institution };
}
