import mongoose from 'mongoose';

export const LEAD_STATUS = ['new', 'contacted', 'interested', 'applied', 'admitted', 'not-interested', 'spam'];

const leadSchema = new mongoose.Schema(
  {
    institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    course: String,
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    city: String,
    message: String,
    source: { type: String, enum: ['enquiry', 'spot-admission', 'compare', 'brochure', 'application'], default: 'enquiry' },
    spotAdmission: { type: mongoose.Schema.Types.ObjectId, ref: 'SpotAdmission' },
    otpVerified: { type: Boolean, default: false },
    consent: { type: Boolean, default: false },
    status: { type: String, enum: LEAD_STATUS, default: 'new', index: true },
    notes: [{ text: String, by: String, at: { type: Date, default: Date.now } }],
    enquiryCount: { type: Number, default: 1 },
    lastEnquiryAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Lead = mongoose.model('Lead', leadSchema);
