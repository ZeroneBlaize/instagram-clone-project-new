import crypto from 'node:crypto';
import { Router } from 'express';
import { DataRepository, toPublicUser } from '../db/repository.js';
import { AuthedRequest, optionalAuth, requireAuth } from '../middleware/auth.js';

export function createUsersRouter(repo: DataRepository) {
  const router = Router();

  router.get('/', optionalAuth, async (req: AuthedRequest, res) => {
    const q = req.query.search ? String(req.query.search) : undefined;
    const users = await repo.listUsers(q);
    res.json({
      users: users.map((u) => toPublicUser(u, req.user?.userId)),
    });
  });

  router.get('/me/stats', requireAuth, async (req: AuthedRequest, res) => {
    const stats = await repo.getCreatorStats(req.user!.userId);
    if (!stats) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ stats });
  });

  router.get('/:username', optionalAuth, async (req: AuthedRequest, res) => {
    const user = await repo.findUserByUsername(String(req.params.username));
    if (!user) {
      res.status(404).json({ error: 'Creator not found.' });
      return;
    }
    const posts = await repo.listPosts({
      viewerId: req.user?.userId,
      tab: 'user',
      targetUserId: user.id,
    });
    res.json({
      user: toPublicUser(user, req.user?.userId, posts.length),
      posts,
    });
  });

  router.post('/:id/follow', requireAuth, async (req: AuthedRequest, res) => {
    const targetId = String(req.params.id);
    if (targetId === req.user!.userId) {
      res.status(400).json({ error: 'You cannot follow yourself.' });
      return;
    }
    const target = await repo.findUserById(targetId);
    if (!target) {
      res.status(404).json({ error: 'Creator not found.' });
      return;
    }
    const result = await repo.toggleFollow(req.user!.userId, targetId);
    if (result.following) {
      await repo.createNotification({
        id: `ntf_${crypto.randomUUID().slice(0, 8)}`,
        userId: targetId,
        actorId: req.user!.userId,
        type: 'follow',
        postId: null,
        message: 'started following you',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    res.json(result);
  });

  return router;
}
