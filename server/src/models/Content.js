import mongoose from 'mongoose';

export const CONTENT_KINDS = ['article', 'news', 'podcast', 'virtual-tour', 'exam'];

const contentSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: CONTENT_KINDS, required: true, index: true },
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    excerpt: String,
    body: String,
    cover: String,
    mediaUrl: String,
    category: String,
    tags: [String],
    institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
    published: { type: Boolean, default: false, index: true },
    publishedAt: Date,
    views: { type: Number, default: 0 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Content = mongoose.model('Content', contentSchema);
