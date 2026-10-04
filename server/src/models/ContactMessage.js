import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    subject: String,
    service: String,
    message: { type: String, required: true },
    handled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const ContactMessage = mongoose.model('ContactMessage', contactSchema);
