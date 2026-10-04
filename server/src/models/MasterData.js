import mongoose from 'mongoose';

export const MASTER_KINDS = ['category', 'city', 'board', 'university', 'facility', 'stream'];

const masterSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: MASTER_KINDS, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    meta: { icon: String, appliesTo: String, state: String },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
masterSchema.index({ kind: 1, slug: 1 }, { unique: true });

export const MasterData = mongoose.model('MasterData', masterSchema);
