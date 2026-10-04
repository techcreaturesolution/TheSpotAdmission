import { Notification } from '../models/Notification.js';

export async function notifyUser(user, title, body, link) {
  if (!user) return;
  await Notification.create({ user, title, body, link }).catch((err) => console.error('[notify]', err.message));
}

export async function notifyAdmins(title, body, link) {
  await Notification.create({ audience: 'admins', title, body, link }).catch((err) => console.error('[notify]', err.message));
}
