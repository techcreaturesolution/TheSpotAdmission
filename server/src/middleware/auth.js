import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

async function userFromRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new HttpError(401, 'Invalid or expired session');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw new HttpError(401, 'Account not found or disabled');
  return user;
}

export async function requireAuth(req, _res, next) {
  const user = await userFromRequest(req);
  if (!user) throw new HttpError(401, 'Authentication required');
  req.user = user;
  next();
}

export async function optionalAuth(req, _res, next) {
  try {
    req.user = await userFromRequest(req);
  } catch {
    req.user = null;
  }
  next();
}

export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.role)) throw new HttpError(403, `Requires ${roles.join(' or ')} access`);
    next();
  };
