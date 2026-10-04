import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    name: String,
    phone: { type: String, required: true },
    email: String,
    city: String,
    course: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    active: { type: Boolean, default: true },
    lastNotifiedAt: Date,
  },
  { timestamps: true },
);
alertSchema.index({ phone: 1, city: 1, course: 1 }, { unique: true });

export const SpotAlert = mongoose.model('SpotAlert', alertSchema);
