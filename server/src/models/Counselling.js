import mongoose from 'mongoose';

export const COUNSELLING_TYPES = ['career', 'pre-primary', 'school', 'college-admission', 'personalized', 'abroad', 'appointment'];
export const COUNSELLING_STATUS = ['pending', 'confirmed', 'completed', 'cancelled', 'follow-up'];

const counsellingSchema = new mongoose.Schema(
  {
    type: { type: String, enum: COUNSELLING_TYPES, required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true },
    studentClass: String,
    city: String,
    mode: { type: String, enum: ['online', 'in-person', 'phone'], default: 'online' },
    preferredDate: Date,
    preferredSlot: String,
    message: String,
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: COUNSELLING_STATUS, default: 'pending', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    meetingLink: String,
    counsellorNotes: String,
  },
  { timestamps: true },
);

export const Counselling = mongoose.model('Counselling', counsellingSchema);
