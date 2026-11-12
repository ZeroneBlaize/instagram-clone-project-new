import { env } from '../config/env.js';
import { evaluateContentGuardrails, stripHtmlAndControl } from './contentGuard.js';

export interface CaptionAssistInput {
  topic: string;
  mood?: 'editorial' | 'minimal' | 'storytelling' | 'technical';
  mediaKind?: 'photo' | 'reel';
}

export interface CaptionAssistResult {
  caption: string;
  altText: string;
  tags: string[];
  source: 'openrouter' | 'deterministic-fallback';
  guardrailPassed: boolean;
}

const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions/gi,
  /system\s*prompt/gi,
  /<\|im_start\|>|<\|im_end\|>/gi,
];

function scrubPromptInjection(input: string): string {
  let clean = stripHtmlAndControl(input);
  for (const rx of INJECTION_PATTERNS) {
    clean = clean.replace(rx, '');
  }
  return clean.trim().slice(0, 280);
}

function deterministicAssist(topic: string, mood: string, mediaKind: string): CaptionAssistResult {
  const cleanTopic = topic || 'Everyday visual moments';
  const words = cleanTopic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !['the', 'and', 'for', 'with', 'from'].includes(w));

  const baseTags = [...new Set([...words.slice(0, 3), mediaKind === 'reel' ? 'reels' : 'photography', 'framenew'])];
  const hashtags = baseTags.map((t) => `#${t}`).join(' ');

  const openers: Record<string, string> = {
    editorial: `Light, texture, and quiet geometry — ${cleanTopic}.`,
    minimal: `${cleanTopic}.`,
    storytelling: `Captured a pause worth keeping: ${cleanTopic}.`,
    technical: `Frame study: ${cleanTopic} (natural exposure, crisp composition).`,
  };

  const caption = `${openers[mood] || openers.editorial} ${hashtags}`.trim();
  const altText = `${mediaKind === 'reel' ? 'Short motion clip' : 'Editorial photograph'} depicting ${cleanTopic}, composed with clear subject contrast.`;

  return {
    caption,
    altText,
    tags: baseTags,
    source: 'deterministic-fallback',
    guardrailPassed: true,
  };
}

export async function generateSafeCaptionAssist(input: CaptionAssistInput): Promise<CaptionAssistResult> {
  const cleanTopic = scrubPromptInjection(input.topic);
  const inputCheck = evaluateContentGuardrails(cleanTopic, { maxLength: 280 });
  if (!inputCheck.allowed) {
    throw new Error(inputCheck.reason || 'Input rejected by AI safety guardrail.');
  }

  const mood = input.mood || 'editorial';
  const mediaKind = input.mediaKind || 'photo';

  if (env.OPENROUTER_API_KEY) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3.5-lightning:free',
          max_tokens: 220,
          temperature: 0.5,
          messages: [
            {
              role: 'system',
              content:
                'Return strict JSON {"caption": string, "altText": string} for a visual social post. Keep caption under 180 chars with 2-4 hashtags. Never include secrets, links, or HTML.',
            },
            {
              role: 'user',
              content: `Topic: ${inputCheck.sanitizedText}. Mood: ${mood}. Format: ${mediaKind}.`,
            },
          ],
        }),
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const json = (await resp.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const rawContent = json.choices?.[0]?.message?.content || '';
        const match = rawContent.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as { caption?: string; altText?: string };
          if (parsed.caption && parsed.altText) {
            const outCheck = evaluateContentGuardrails(parsed.caption, { maxLength: 400 });
            const altCheck = evaluateContentGuardrails(parsed.altText, { maxLength: 280 });
            if (outCheck.allowed && altCheck.allowed) {
              return {
                caption: outCheck.sanitizedText,
                altText: altCheck.sanitizedText,
                tags: outCheck.tags,
                source: 'openrouter',
                guardrailPassed: true,
              };
            }
          }
        }
      }
    } catch {
      // Safe fallback to deterministic engine if upstream OpenRouter times out or fails
    }
  }

  return deterministicAssist(inputCheck.sanitizedText, mood, mediaKind);
}
