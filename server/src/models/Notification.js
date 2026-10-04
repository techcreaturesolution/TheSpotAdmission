import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    audience: { type: String, enum: ['user', 'admins'], default: 'user' },
    title: { type: String, required: true },
    body: String,
    link: String,
    channel: { type: String, enum: ['in-app', 'sms', 'email', 'whatsapp'], default: 'in-app' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Notification = mongoose.model('Notification', notificationSchema);
