import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const make = (windowMs, limit) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => env.nodeEnv === 'test', message: { error: 'Too many requests, please slow down.' } });

export const otpLimiter = make(10 * 60_000, 8);
export const formLimiter = make(10 * 60_000, 20);
export const authLimiter = make(15 * 60_000, 30);
