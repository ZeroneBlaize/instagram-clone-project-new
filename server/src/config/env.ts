import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '../.env' });
dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  MONGODB_URI: z.string().optional().default(''),
  OPENROUTER_API_KEY: z.string().optional().default(''),
  SQLITE_PATH: z.string().optional().default(''),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;
if (raw.NODE_ENV === 'production' && (!raw.JWT_SECRET || raw.JWT_SECRET.length < 32)) {
  throw new Error('Production requires JWT_SECRET of at least 32 characters.');
}

// Generate an ephemeral secret only for local dev/test when JWT_SECRET is omitted.
const resolvedSecret =
  raw.JWT_SECRET && raw.JWT_SECRET.length >= 16
    ? raw.JWT_SECRET
    : crypto.createHash('sha256').update(`framenew-${raw.NODE_ENV}-ephemeral`).digest('hex');

export const env = {
  ...raw,
  JWT_SECRET: resolvedSecret,
};
