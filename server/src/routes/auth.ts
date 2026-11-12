import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { DataRepository, toPublicUser } from '../db/repository.js';
import { evaluateContentGuardrails, stripHtmlAndControl, validateSafeMediaOrWebUrl } from '../guardrails/contentGuard.js';
import { AuthedRequest, requireAuth, signAuthToken } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const RegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9._]+$/, 'Username may contain letters, numbers, dots, and underscores.'),
  displayName: z.string().trim().min(2).max(50),
  email: z.string().trim().email(),
  password: z.string().min(8).max(100),
});

const LoginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

const DemoLoginSchema = z.object({
  username: z.enum(['alex_rivera', 'maya_chen', 'kenji_tanaka', 'sofia_lopez']).default('alex_rivera'),
});

const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(50).optional(),
  bio: z.string().max(240).optional(),
  website: z.string().max(180).optional(),
  avatarUrl: z.string().max(240).optional(),
});

export function createAuthRouter(repo: DataRepository) {
  const router = Router();

  router.post('/register', validateBody(RegisterSchema), async (req, res) => {
    const { username, displayName, email, password } = req.body as z.infer<typeof RegisterSchema>;

    const nameCheck = evaluateContentGuardrails(displayName, { maxLength: 50 });
    if (!nameCheck.allowed) {
      res.status(400).json({ error: nameCheck.reason, code: nameCheck.code });
      return;
    }

    if (await repo.findUserByUsername(username)) {
      res.status(409).json({ error: 'Username is already taken.', code: 'USERNAME_TAKEN' });
      return;
    }
    if (await repo.findUserByEmail(email)) {
      res.status(409).json({ error: 'Email is already registered.', code: 'EMAIL_TAKEN' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const user = await repo.createUser({
      id,
      username: username.toLowerCase(),
      displayName: nameCheck.sanitizedText,
      email: email.toLowerCase(),
      passwordHash,
      avatarUrl: '/media/avatars/alex.svg',
      bio: 'Visual creator on FrameNew.',
      website: '',
      verified: false,
      followers: [],
      following: ['usr_alex', 'usr_maya'],
      savedPostIds: [],
      createdAt: new Date().toISOString(),
    });

    const token = signAuthToken({ userId: user.id, username: user.username });
    res.status(201).json({ token, user: toPublicUser(user, user.id, 0) });
  });

  router.post('/login', validateBody(LoginSchema), async (req, res) => {
    const { identifier, password } = req.body as z.infer<typeof LoginSchema>;
    const cleanId = stripHtmlAndControl(identifier).toLowerCase();

    const user = cleanId.includes('@')
      ? await repo.findUserByEmail(cleanId)
      : await repo.findUserByUsername(cleanId);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials.', code: 'AUTH_INVALID_CREDENTIALS' });
      return;
    }

    const posts = await repo.listPosts({ tab: 'user', targetUserId: user.id });
    const token = signAuthToken({ userId: user.id, username: user.username });
    res.json({ token, user: toPublicUser(user, user.id, posts.length) });
  });

  router.post('/demo', validateBody(DemoLoginSchema), async (req, res) => {
    const { username } = req.body as z.infer<typeof DemoLoginSchema>;
    const user = await repo.findUserByUsername(username);
    if (!user) {
      res.status(404).json({ error: 'Demo account not found.' });
      return;
    }
    const posts = await repo.listPosts({ tab: 'user', targetUserId: user.id });
    const token = signAuthToken({ userId: user.id, username: user.username });
    res.json({ token, user: toPublicUser(user, user.id, posts.length) });
  });

  router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
    const user = await repo.findUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const posts = await repo.listPosts({ tab: 'user', targetUserId: user.id });
    res.json({ user: toPublicUser(user, user.id, posts.length) });
  });

  router.patch('/me', requireAuth, validateBody(UpdateProfileSchema), async (req: AuthedRequest, res) => {
    const body = req.body as z.infer<typeof UpdateProfileSchema>;
    const patch: Partial<{ displayName: string; bio: string; website: string; avatarUrl: string }> = {};

    if (body.displayName !== undefined) {
      const check = evaluateContentGuardrails(body.displayName, { maxLength: 50 });
      if (!check.allowed) {
        res.status(400).json({ error: check.reason, code: check.code });
        return;
      }
      patch.displayName = check.sanitizedText;
    }

    if (body.bio !== undefined) {
      const check = evaluateContentGuardrails(body.bio, { maxLength: 240 });
      if (!check.allowed) {
        res.status(400).json({ error: check.reason, code: check.code });
        return;
      }
      patch.bio = check.sanitizedText;
    }

    if (body.website !== undefined) {
      const urlCheck = validateSafeMediaOrWebUrl(body.website, { allowEmpty: true });
      if (!urlCheck.valid) {
        res.status(400).json({ error: urlCheck.reason, code: 'GUARDRAIL_INVALID_URL' });
        return;
      }
      patch.website = urlCheck.normalized;
    }

    if (body.avatarUrl !== undefined) {
      const avCheck = validateSafeMediaOrWebUrl(body.avatarUrl, { allowRelativeMedia: true });
      if (!avCheck.valid) {
        res.status(400).json({ error: avCheck.reason, code: 'GUARDRAIL_INVALID_URL' });
        return;
      }
      patch.avatarUrl = avCheck.normalized;
    }

    const updated = await repo.updateUserProfile(req.user!.userId, patch);
    if (!updated) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const posts = await repo.listPosts({ tab: 'user', targetUserId: updated.id });
    res.json({ user: toPublicUser(updated, updated.id, posts.length) });
  });

  return router;
}
