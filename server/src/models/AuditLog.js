import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    target: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

export const AuditLog = mongoose.model('AuditLog', auditSchema);
