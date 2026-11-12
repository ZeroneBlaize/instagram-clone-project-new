import rateLimit from 'express-rate-limit';

export interface LimiterOptions {
  authMax?: number;
  writeMax?: number;
  aiMax?: number;
  readMax?: number;
}

export function createRateLimiters(opts: LimiterOptions = {}) {
  const isTest = process.env.NODE_ENV === 'test';
  const mult = isTest ? 100 : 1;

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: opts.authMax ?? 25 * mult,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'Too many authentication attempts. Please wait before retrying.',
      code: 'RATE_LIMIT_AUTH',
    },
  });

  const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: opts.writeMax ?? 40 * mult,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'Action rate limit reached. Slow down and retry after the cooldown.',
      code: 'RATE_LIMIT_WRITE',
    },
  });

  const aiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: opts.aiMax ?? 20 * mult,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'AI assistant quota reached for this window. Please retry shortly.',
      code: 'RATE_LIMIT_AI',
    },
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: opts.readMax ?? 300 * mult,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'API rate limit exceeded.',
      code: 'RATE_LIMIT_API',
    },
  });

  return { authLimiter, writeLimiter, aiLimiter, apiLimiter };
}
