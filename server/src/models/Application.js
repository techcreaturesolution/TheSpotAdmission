import mongoose from 'mongoose';

export const APPLICATION_STATUS = ['submitted', 'under-review', 'shortlisted', 'offered', 'admitted', 'rejected', 'withdrawn'];

const applicationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    courseName: { type: String, required: true },
    personal: { name: String, dob: String, gender: String, phone: String, email: String, address: String, category: String },
    academic: { lastExam: String, board: String, percentage: Number, entranceExam: String, entranceScore: String },
    parent: { fatherName: String, motherName: String, guardianPhone: String },
    documents: [{ label: String, url: String }],
    declaration: { type: Boolean, default: false },
    status: { type: String, enum: APPLICATION_STATUS, default: 'submitted', index: true },
    timeline: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true },
);

export const Application = mongoose.model('Application', applicationSchema);
