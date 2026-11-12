import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { DataRepository } from '../db/repository.js';
import { evaluateContentGuardrails } from '../guardrails/contentGuard.js';
import { AuthedRequest, requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const SendMessageSchema = z.object({
  text: z.string().trim().min(1).max(600),
});

export function createMessagesRouter(repo: DataRepository) {
  const router = Router();

  router.get('/conversations', requireAuth, async (req: AuthedRequest, res) => {
    const conversations = await repo.listConversations(req.user!.userId);
    res.json({ conversations });
  });

  router.get('/:partnerId', requireAuth, async (req: AuthedRequest, res) => {
    const partnerId = String(req.params.partnerId);
    const partner = await repo.findUserById(partnerId);
    if (!partner) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    await repo.markThreadRead(req.user!.userId, partnerId);
    const messages = await repo.listThreadMessages(req.user!.userId, partnerId);
    res.json({ messages });
  });

  router.post('/:partnerId', requireAuth, validateBody(SendMessageSchema), async (req: AuthedRequest, res) => {
    const partnerId = String(req.params.partnerId);
    if (partnerId === req.user!.userId) {
      res.status(400).json({ error: 'Cannot message yourself.' });
      return;
    }
    const partner = await repo.findUserById(partnerId);
    if (!partner) {
      res.status(404).json({ error: 'Recipient not found.' });
      return;
    }

    const { text } = req.body as z.infer<typeof SendMessageSchema>;
    const guard = evaluateContentGuardrails(text, { maxLength: 600 });
    if (!guard.allowed) {
      res.status(400).json({ error: guard.reason, code: guard.code });
      return;
    }

    const message = await repo.createMessage({
      id: `msg_${crypto.randomUUID().slice(0, 8)}`,
      senderId: req.user!.userId,
      recipientId: partnerId,
      text: guard.sanitizedText,
      read: false,
      createdAt: new Date().toISOString(),
    });

    await repo.createNotification({
      id: `ntf_${crypto.randomUUID().slice(0, 8)}`,
      userId: partnerId,
      actorId: req.user!.userId,
      type: 'message',
      postId: null,
      message: `sent a direct message: "${guard.sanitizedText.slice(0, 50)}"`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message });
  });

  return router;
}
