import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import institutionRoutes from './routes/institution.js';
import publicRoutes from './routes/public.js';
import studentRoutes from './routes/student.js';
import uploadRoutes, { uploadRoot } from './routes/uploads.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/uploads', express.static(uploadRoot, { maxAge: '7d', index: false }));
  app.use('/api/auth', authRoutes);
  app.use('/api/me', requireAuth, studentRoutes);
  app.use('/api/uploads', requireAuth, uploadRoutes);
  app.use('/api/institution', requireAuth, requireRole('institution', 'admin'), institutionRoutes);
  app.use('/api/admin', requireAuth, requireRole('admin'), adminRoutes);
  app.use('/api', publicRoutes);
  app.use('/api', notFound);

  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (env.nodeEnv === 'production') {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
