import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    purpose: { type: String, enum: ['login', 'lead', 'spot-alert', 'counselling', 'application'], required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    verifiedAt: Date,
    lockedUntil: Date,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const Otp = mongoose.model('Otp', otpSchema);
