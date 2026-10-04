import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { Institution } from './models/Institution.js';
import { closeExpiredSpots } from './services/spot.js';

await connectDb();
await Institution.syncIndexes();
createApp().listen(env.port, '0.0.0.0', () => console.log(`[api] listening on http://0.0.0.0:${env.port}`));
setInterval(() => closeExpiredSpots().catch((err) => console.error('[spot]', err.message)), 3600_000).unref();
