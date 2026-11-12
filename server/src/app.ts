import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { env } from './config/env.js';
import { DataRepository } from './db/repository.js';
import { createRateLimiters, LimiterOptions } from './guardrails/rateLimiters.js';
import { createAiRouter } from './routes/ai.js';
import { createAuthRouter } from './routes/auth.js';
import { createMessagesRouter } from './routes/messages.js';
import { createNotificationsRouter } from './routes/notifications.js';
import { createPostsRouter } from './routes/posts.js';
import { createStoriesRouter } from './routes/stories.js';
import { createUsersRouter } from './routes/users.js';

export interface AppConfig {
  repo: DataRepository;
  uploadDir?: string;
  clientDistDir?: string;
  rateLimitOptions?: LimiterOptions;
}

export function createApp(config: AppConfig) {
  const app = express();
  const uploadDir = config.uploadDir ?? path.resolve(process.cwd(), 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const limiters = createRateLimiters(config.rateLimitOptions);

  app.set('trust proxy', 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
        },
      },
    })
  );

  const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  const platformOrigins = [
    process.env.RENDER_EXTERNAL_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined,
  ].filter((origin): origin is string => Boolean(origin));

  app.use(
    cors((req, cb) => {
      const origin = req.header('Origin');
      if (!origin) {
        cb(null, { origin: true, credentials: true });
        return;
      }
      const forwardedHost = req.header('x-forwarded-host') || req.header('host');
      const forwardedProto = req.header('x-forwarded-proto') || req.protocol;
      const sameHostOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : '';
      if (
        allowedOrigins.includes(origin) ||
        platformOrigins.includes(origin) ||
        (sameHostOrigin !== '' && origin === sameHostOrigin)
      ) {
        cb(null, { origin: true, credentials: true });
        return;
      }
      cb(new Error('CORS origin blocked by security guardrail.'));
    })
  );

  app.use(express.json({ limit: '512kb' }));
  app.use(express.urlencoded({ extended: false, limit: '512kb' }));
  app.use('/uploads', express.static(uploadDir, { maxAge: '1d', index: false }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'framenew-api',
      driver: config.repo.driver,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api', limiters.apiLimiter);
  app.use('/api/auth', limiters.authLimiter, createAuthRouter(config.repo));
  app.use('/api/posts', limiters.writeLimiter, createPostsRouter(config.repo, uploadDir));
  app.use('/api/stories', limiters.writeLimiter, createStoriesRouter(config.repo, uploadDir));
  app.use('/api/users', createUsersRouter(config.repo));
  app.use('/api/messages', limiters.writeLimiter, createMessagesRouter(config.repo));
  app.use('/api/notifications', createNotificationsRouter(config.repo));
  app.use('/api/ai', limiters.aiLimiter, createAiRouter());

  // Serve built client SPA in production when client/dist exists
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const clientDistDir =
    config.clientDistDir ??
    [
      path.resolve(moduleDir, '../../client/dist'),
      path.resolve(process.cwd(), '../client/dist'),
      path.resolve(process.cwd(), 'client/dist'),
    ].find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ??
    path.resolve(process.cwd(), '../client/dist');
  if (fs.existsSync(path.join(clientDistDir, 'index.html'))) {
    app.use(express.static(clientDistDir));
    app.get('/{*splat}', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        next();
        return;
      }
      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  // Centralized guardrail & error handler (never leaks raw stack traces)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      res.status(status).json({ error: `Upload guardrail: ${err.message}`, code: 'GUARDRAIL_UPLOAD_LIMIT' });
      return;
    }
    if (err instanceof Error && err.message.startsWith('GUARDRAIL_')) {
      res.status(400).json({ error: err.message, code: 'GUARDRAIL_REJECTED' });
      return;
    }
    if (err instanceof Error && err.message.includes('CORS')) {
      res.status(403).json({ error: err.message, code: 'CORS_FORBIDDEN' });
      return;
    }
    if (env.NODE_ENV !== 'production') {
      console.error('Unhandled server error:', err);
    }
    res.status(500).json({ error: 'Internal server error.', code: 'INTERNAL_ERROR' });
  });

  return app;
}
