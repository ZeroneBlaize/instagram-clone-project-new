import crypto from 'node:crypto';
import { Router } from 'express';
import { DataRepository } from '../db/repository.js';
import { evaluateContentGuardrails, validateSafeMediaOrWebUrl } from '../guardrails/contentGuard.js';
import { saveValidatedUpload, uploadMiddleware } from '../guardrails/uploadGuard.js';
import { AuthedRequest, optionalAuth, requireAuth } from '../middleware/auth.js';

export function createStoriesRouter(repo: DataRepository, uploadDir: string) {
  const router = Router();

  router.get('/', optionalAuth, async (req: AuthedRequest, res) => {
    const groups = await repo.listActiveStoryGroups(req.user?.userId);
    res.json({ storyGroups: groups });
  });

  router.post('/', requireAuth, uploadMiddleware.single('media'), async (req: AuthedRequest, res) => {
    const captionRaw = String(req.body?.caption || '');
    const guard = evaluateContentGuardrails(captionRaw, { maxLength: 160 });
    if (!guard.allowed) {
      res.status(400).json({ error: guard.reason, code: guard.code });
      return;
    }

    let mediaUrl = '';
    if (req.file) {
      try {
        mediaUrl = saveValidatedUpload(req.file, uploadDir);
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Invalid story media.',
          code: 'GUARDRAIL_INVALID_MEDIA',
        });
        return;
      }
    } else if (req.body?.mediaUrl) {
      const urlCheck = validateSafeMediaOrWebUrl(String(req.body.mediaUrl), { allowRelativeMedia: true });
      if (!urlCheck.valid) {
        res.status(400).json({ error: urlCheck.reason, code: 'GUARDRAIL_INVALID_URL' });
        return;
      }
      mediaUrl = urlCheck.normalized;
    } else {
      res.status(400).json({ error: 'Story media is required.', code: 'MEDIA_REQUIRED' });
      return;
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 3600 * 1000);
    const story = await repo.createStory({
      id: `sty_${crypto.randomUUID().slice(0, 8)}`,
      userId: req.user!.userId,
      mediaUrl,
      caption: guard.sanitizedText,
      viewedBy: [],
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    });
    res.status(201).json({ story });
  });

  router.post('/:id/view', requireAuth, async (req: AuthedRequest, res) => {
    await repo.markStoryViewed(String(req.params.id), req.user!.userId);
    res.json({ viewed: true });
  });

  return router;
}
