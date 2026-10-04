import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String, trim: true },
    body: { type: String, trim: true },
    relation: { type: String, enum: ['student', 'alumni', 'parent'], default: 'student' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  },
  { timestamps: true },
);
reviewSchema.index({ institution: 1, user: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
