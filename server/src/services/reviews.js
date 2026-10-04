import mongoose from 'mongoose';
import { Institution } from '../models/Institution.js';
import { Review } from '../models/Review.js';

export async function recomputeRating(institutionId) {
  const [agg] = await Review.aggregate([
    { $match: { institution: new mongoose.Types.ObjectId(String(institutionId)), status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const rating = { avg: agg ? Math.round(agg.avg * 10) / 10 : 0, count: agg?.count || 0 };
  await Institution.updateOne({ _id: institutionId }, { $set: { rating } });
  return rating;
}
