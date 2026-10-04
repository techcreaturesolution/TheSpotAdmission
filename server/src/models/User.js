import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    phone: { type: String, trim: true, sparse: true, unique: true },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ['student', 'institution', 'counsellor', 'admin'], default: 'student', index: true },
    phoneVerified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    profile: {
      city: String,
      state: String,
      currentClass: String,
      stream: String,
      marks: String,
      interests: [String],
    },
    shortlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Institution' }],
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    phoneVerified: this.phoneVerified,
    profile: this.profile || {},
    shortlist: (this.shortlist || []).map(String),
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
