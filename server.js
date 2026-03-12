// server.js  — PocketHost API v3 (Supabase Auth + Supabase DB)
import './config/env.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/error.js';
import { requireAuth } from './middleware/auth.js';

import authRoutes       from './routes/auth.routes.js';
import projectRoutes    from './routes/project.routes.js';
import productRoutes    from './routes/product.routes.js';
import orderRoutes      from './routes/order.routes.js';
import aiRoutes         from './routes/ai.routes.js';
import adminRoutes      from './routes/admin.routes.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = env.ALLOWED_ORIGINS;
    if (allowed.includes(origin) || origin.endsWith(`.${env.DOMAIN}`)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev',
  { stream: { write: msg => logger.info(msg.trim()) } }
));

// Health check (no auth)
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', env: env.NODE_ENV, ts: new Date().toISOString(), v: '3.0.0' })
);

// Public routes
app.use('/api/auth',    authLimiter, authRoutes);
app.use('/api/admin',   adminRoutes);

// Protected routes (all require valid Supabase JWT)
app.use('/api',         apiLimiter);
app.use('/api/projects',  requireAuth, projectRoutes);
app.use('/api/products',  requireAuth, productRoutes);
app.use('/api/orders',    requireAuth, orderRoutes);
app.use('/api/ai',        requireAuth, aiRoutes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.PORT, () =>
  logger.info(`🚀 PocketHost API on :${env.PORT} [${env.NODE_ENV}]`)
);

const shutdown = sig => {
  logger.info(`${sig} — shutting down`);
  server.close(() => { logger.info('closed'); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  err => logger.error('UncaughtException',  { err: err.message }));
process.on('unhandledRejection', err => logger.error('UnhandledRejection', { err }));

export default app;
