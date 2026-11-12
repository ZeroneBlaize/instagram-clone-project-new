import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { DataRepository } from '../db/repository.js';
import { evaluateContentGuardrails, stripHtmlAndControl, validateSafeMediaOrWebUrl } from '../guardrails/contentGuard.js';
import { saveValidatedUpload, uploadMiddleware } from '../guardrails/uploadGuard.js';
import { AuthedRequest, optionalAuth, requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const CommentSchema = z.object({
  text: z.string().trim().min(1).max(400),
});

const ReportSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'misinformation', 'sensitive', 'copyright']),
  details: z.string().max(400).optional().default(''),
});

export function createPostsRouter(repo: DataRepository, uploadDir: string) {
  const router = Router();

  router.get('/', optionalAuth, async (req: AuthedRequest, res) => {
    const tabRaw = String(req.query.tab || 'for-you');
    const tab = (['for-you', 'following', 'saved', 'reels'].includes(tabRaw) ? tabRaw : 'for-you') as
      | 'for-you'
      | 'following'
      | 'saved'
      | 'reels';
    const tag = req.query.tag ? String(req.query.tag) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const posts = await repo.listPosts({
      viewerId: req.user?.userId,
      tab,
      tag,
      search,
    });
    res.json({ posts });
  });

  router.post('/', requireAuth, uploadMiddleware.single('media'), async (req: AuthedRequest, res) => {
    const captionRaw = String(req.body?.caption || '');
    const altTextRaw = String(req.body?.altText || '');
    const locationRaw = String(req.body?.location || '');
    const mediaKind = req.body?.mediaKind === 'reel' ? 'reel' : 'photo';
    const explicitCW = req.body?.contentWarning ? String(req.body.contentWarning) : null;

    if (!captionRaw.trim()) {
      res.status(400).json({ error: 'Caption is required.', code: 'VALIDATION_ERROR' });
      return;
    }

    const guard = evaluateContentGuardrails(captionRaw, {
      maxLength: 800,
      explicitContentWarning: explicitCW,
    });
    if (!guard.allowed) {
      res.status(400).json({ error: guard.reason, code: guard.code });
      return;
    }

    const altGuard = evaluateContentGuardrails(altTextRaw, { maxLength: 280 });
    if (!altGuard.allowed) {
      res.status(400).json({ error: altGuard.reason, code: altGuard.code });
      return;
    }

    let mediaUrl = '';
    if (req.file) {
      try {
        mediaUrl = saveValidatedUpload(req.file, uploadDir);
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Invalid upload.',
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
      res.status(400).json({ error: 'Attach an image file or select a safe preset media URL.', code: 'MEDIA_REQUIRED' });
      return;
    }

    const postId = `pst_${crypto.randomUUID().slice(0, 8)}`;
    await repo.createPost({
      id: postId,
      userId: req.user!.userId,
      mediaUrl,
      mediaKind,
      caption: guard.sanitizedText,
      altText: altGuard.sanitizedText || guard.sanitizedText.slice(0, 120),
      location: stripHtmlAndControl(locationRaw).slice(0, 80),
      tags: guard.tags,
      likes: [],
      contentWarning: guard.contentWarning,
      guardrailStatus: guard.status === 'flagged' ? 'flagged' : 'clean',
      createdAt: new Date().toISOString(),
    });

    const view = await repo.getPostView(postId, req.user!.userId);
    res.status(201).json({ post: view, guardrailStatus: guard.status });
  });

  router.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
    const post = await repo.findPostById(String(req.params.id));
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    if (post.userId !== req.user!.userId) {
      res.status(403).json({ error: 'You may only delete your own posts.', code: 'FORBIDDEN' });
      return;
    }
    await repo.deletePost(post.id);
    res.json({ deleted: true, id: post.id });
  });

  router.post('/:id/like', requireAuth, async (req: AuthedRequest, res) => {
    const post = await repo.findPostById(String(req.params.id));
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const result = await repo.toggleLike(post.id, req.user!.userId);
    if (result.liked && post.userId !== req.user!.userId) {
      await repo.createNotification({
        id: `ntf_${crypto.randomUUID().slice(0, 8)}`,
        userId: post.userId,
        actorId: req.user!.userId,
        type: 'like',
        postId: post.id,
        message: 'liked your post',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    res.json(result);
  });

  router.post('/:id/save', requireAuth, async (req: AuthedRequest, res) => {
    const post = await repo.findPostById(String(req.params.id));
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const result = await repo.toggleSavePost(req.user!.userId, post.id);
    res.json(result);
  });

  router.post('/:id/comments', requireAuth, validateBody(CommentSchema), async (req: AuthedRequest, res) => {
    const post = await repo.findPostById(String(req.params.id));
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const { text } = req.body as z.infer<typeof CommentSchema>;
    const guard = evaluateContentGuardrails(text, { maxLength: 400 });
    if (!guard.allowed) {
      res.status(400).json({ error: guard.reason, code: guard.code });
      return;
    }

    const comment = await repo.addComment({
      id: `cmt_${crypto.randomUUID().slice(0, 8)}`,
      postId: post.id,
      userId: req.user!.userId,
      text: guard.sanitizedText,
      createdAt: new Date().toISOString(),
    });

    if (post.userId !== req.user!.userId) {
      await repo.createNotification({
        id: `ntf_${crypto.randomUUID().slice(0, 8)}`,
        userId: post.userId,
        actorId: req.user!.userId,
        type: 'comment',
        postId: post.id,
        message: `commented: "${guard.sanitizedText.slice(0, 60)}"`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    res.status(201).json({ comment });
  });

  router.delete('/:postId/comments/:commentId', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const deleted = await repo.deleteComment(String(req.params.commentId), req.user!.userId);
      if (!deleted) {
        res.status(404).json({ error: 'Comment not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      if (err instanceof Error && err.message === 'FORBIDDEN') {
        res.status(403).json({ error: 'You can only delete your own comments.', code: 'FORBIDDEN' });
        return;
      }
      throw err;
    }
  });

  router.post('/:id/report', requireAuth, validateBody(ReportSchema), async (req: AuthedRequest, res) => {
    const post = await repo.findPostById(String(req.params.id));
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const { reason, details } = req.body as z.infer<typeof ReportSchema>;
    const report = await repo.createReport({
      id: `rpt_${crypto.randomUUID().slice(0, 8)}`,
      postId: post.id,
      reporterId: req.user!.userId,
      reason,
      details: stripHtmlAndControl(details).slice(0, 400),
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ report, message: 'Report logged for safety review.' });
  });

  return router;
}
