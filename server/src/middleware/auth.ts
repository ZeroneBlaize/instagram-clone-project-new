import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthPayload {
  userId: string;
  username: string;
}

export interface AuthedRequest extends Request {
  user?: AuthPayload;
}

export function signAuthToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required.', code: 'AUTH_REQUIRED' });
    return;
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = { userId: decoded.userId, username: decoded.username };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token.', code: 'AUTH_INVALID_TOKEN' });
  }
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
      req.user = { userId: decoded.userId, username: decoded.username };
    } catch {
      // Ignore expired/invalid token on public read routes
    }
  }
  next();
}
