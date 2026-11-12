import { Router } from 'express';
import { DataRepository } from '../db/repository.js';
import { AuthedRequest, requireAuth } from '../middleware/auth.js';

export function createNotificationsRouter(repo: DataRepository) {
  const router = Router();

  router.get('/', requireAuth, async (req: AuthedRequest, res) => {
    const notifications = await repo.listNotifications(req.user!.userId);
    res.json({ notifications });
  });

  router.post('/read-all', requireAuth, async (req: AuthedRequest, res) => {
    await repo.markAllNotificationsRead(req.user!.userId);
    res.json({ ok: true });
  });

  return router;
}
