import crypto from 'node:crypto';
import axios from 'axios';
import { env } from '../config/env.js';
import { Otp } from '../models/Otp.js';
import { HttpError } from '../utils/httpError.js';
import { isIndianMobile, normalizePhone } from '../utils/text.js';

const hash = (phone, code) => crypto.createHmac('sha256', env.jwtSecret).update(`${phone}:${code}`).digest('hex');

export function smsConfigured() {
  return Boolean(env.msg91.authKey && env.msg91.templateId);
}

async function deliver(phone, code) {
  if (!smsConfigured()) return false;
  await axios.post(
    'https://control.msg91.com/api/v5/otp',
    { template_id: env.msg91.templateId, mobile: `91${phone}`, otp: code },
    { headers: { authkey: env.msg91.authKey }, timeout: 10000 },
  );
  return true;
}

export async function sendOtp(rawPhone, purpose) {
  const phone = normalizePhone(rawPhone);
  if (!isIndianMobile(phone)) throw new HttpError(400, 'Enter a valid 10-digit Indian mobile number');
  const last = await Otp.findOne({ phone, purpose }).sort({ createdAt: -1 });
  if (last?.lockedUntil && last.lockedUntil > new Date()) {
    throw new HttpError(429, 'Too many wrong attempts. Try again after 10 minutes.');
  }
  if (last && !last.verifiedAt && Date.now() - last.createdAt.getTime() < env.otp.resendSeconds * 1000) {
    throw new HttpError(429, `Please wait ${env.otp.resendSeconds} seconds before requesting a new OTP`);
  }
  const code = String(crypto.randomInt(100000, 1000000));
  await Otp.create({ phone, purpose, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + env.otp.ttlMinutes * 60_000) });
  const sent = await deliver(phone, code).catch((err) => {
    console.error('[otp] SMS delivery failed', err.message);
    return false;
  });
  if (!sent && !env.otp.devEcho) throw new HttpError(503, 'SMS service is not available. Please try again later.');
  return { phone, sent, devCode: sent ? undefined : env.otp.devEcho ? code : undefined, resendSeconds: env.otp.resendSeconds };
}

export async function verifyOtp(rawPhone, purpose, code) {
  const phone = normalizePhone(rawPhone);
  const otp = await Otp.findOne({ phone, purpose, verifiedAt: null }).sort({ createdAt: -1 });
  if (!otp || otp.expiresAt < new Date()) throw new HttpError(400, 'OTP expired. Please request a new one.');
  if (otp.lockedUntil && otp.lockedUntil > new Date()) throw new HttpError(429, 'Too many wrong attempts. Try again after 10 minutes.');
  if (otp.codeHash !== hash(phone, String(code || '').trim())) {
    otp.attempts += 1;
    if (otp.attempts >= env.otp.maxAttempts) otp.lockedUntil = new Date(Date.now() + 10 * 60_000);
    await otp.save();
    throw new HttpError(400, 'Incorrect OTP');
  }
  otp.verifiedAt = new Date();
  await otp.save();
  return phone;
}
