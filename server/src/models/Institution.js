import mongoose from 'mongoose';

export const INSTITUTION_TYPES = ['school', 'college', 'university', 'coaching', 'preschool'];
export const OWNERSHIP = ['government', 'grant-in-aid', 'private', 'deemed', 'autonomous'];
export const INSTITUTION_STATUS = ['draft', 'pending', 'approved', 'rejected', 'suspended'];

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    level: { type: String, trim: true },
    stream: { type: String, trim: true },
    duration: String,
    eligibility: String,
    feesPerYear: Number,
    seatsTotal: { type: Number, default: 0 },
    seatsVacant: { type: Number, default: 0 },
    mode: { type: String, enum: ['full-time', 'part-time', 'online', 'distance'], default: 'full-time' },
    admissionProcess: String,
  },
  { timestamps: true },
);

const institutionSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: INSTITUTION_TYPES, required: true, index: true },
    category: { type: String, trim: true, index: true },
    ownership: { type: String, enum: OWNERSHIP, default: 'private' },
    board: { type: String, trim: true },
    university: { type: String, trim: true },
    about: String,
    logo: String,
    cover: String,
    gallery: [String],
    brochure: String,
    virtualTourUrl: String,
    contact: { phone: String, email: String, website: String },
    address: {
      line: String,
      city: { type: String, trim: true },
      district: String,
      state: { type: String, trim: true, default: 'Gujarat' },
      pincode: String,
      lat: Number,
      lng: Number,
    },
    facilities: [String],
    accreditation: [String],
    establishedYear: Number,
    fees: { min: Number, max: Number },
    placements: { highestLpa: Number, averageLpa: Number, recruiters: [String] },
    hostel: Boolean,
    transport: Boolean,
    scholarships: String,
    faqs: [{ q: String, a: String }],
    courses: [courseSchema],
    rating: { avg: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    status: { type: String, enum: INSTITUTION_STATUS, default: 'draft', index: true },
    reviewRemarks: String,
    reviewedAt: Date,
    isVerified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    claimRequest: { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, note: String, at: Date },
    views: { type: Number, default: 0 },
    seo: { title: String, description: String },
  },
  { timestamps: true },
);

institutionSchema.index({ name: 'text', about: 'text', 'courses.name': 'text', 'address.city': 'text' });
institutionSchema.index({ type: 1, 'address.city': 1, status: 1 });

export const Institution = mongoose.model('Institution', institutionSchema);
