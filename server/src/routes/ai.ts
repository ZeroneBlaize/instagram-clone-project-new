import { Router } from 'express';
import { z } from 'zod';
import { generateSafeCaptionAssist } from '../guardrails/aiCaptionGuard.js';
import { evaluateContentGuardrails } from '../guardrails/contentGuard.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const CaptionAssistSchema = z.object({
  topic: z.string().trim().min(2).max(280),
  mood: z.enum(['editorial', 'minimal', 'storytelling', 'technical']).optional(),
  mediaKind: z.enum(['photo', 'reel']).optional(),
});

const GuardCheckSchema = z.object({
  text: z.string().max(1000),
});

export function createAiRouter() {
  const router = Router();

  router.post('/caption-assist', requireAuth, validateBody(CaptionAssistSchema), async (req, res) => {
    try {
      const result = await generateSafeCaptionAssist(req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Guardrail rejected request.',
        code: 'GUARDRAIL_AI_REJECTED',
      });
    }
  });

  router.post('/guardrail-check', requireAuth, validateBody(GuardCheckSchema), (req, res) => {
    const { text } = req.body as z.infer<typeof GuardCheckSchema>;
    const decision = evaluateContentGuardrails(text);
    res.json(decision);
  });

  return router;
}
