import mongoose from 'mongoose';

const spotSchema = new mongoose.Schema(
  {
    institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    courseName: { type: String, required: true, trim: true },
    city: { type: String, index: true },
    vacantSeats: { type: Number, required: true, min: 0 },
    round: String,
    startDate: Date,
    endDate: { type: Date, index: true },
    notice: String,
    documentsRequired: [String],
    status: { type: String, enum: ['pending', 'live', 'closed', 'rejected'], default: 'pending', index: true },
    confirmedSeats: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const SpotAdmission = mongoose.model('SpotAdmission', spotSchema);
