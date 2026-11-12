import { describe, expect, it } from 'vitest';
import {
  evaluateContentGuardrails,
  extractHashtags,
  stripHtmlAndControl,
  validateSafeMediaOrWebUrl,
} from '../src/guardrails/contentGuard.js';
import { detectImageExtensionFromMagicBytes } from '../src/guardrails/uploadGuard.js';

describe('Content & Security Guardrails', () => {
  it('strips HTML tags and zero-width spoofing characters', () => {
    const cleaned = stripHtmlAndControl('<script>alert(1)</script>Hello\u200B World');
    expect(cleaned).toBe('alert(1)Hello World');
  });

  it('blocks credential/secret leaks in posts and comments', () => {
    const ghp = evaluateContentGuardrails('Oops pushed my key ghp_1234567890abcdef1234567890abcdef');
    expect(ghp.allowed).toBe(false);
    expect(ghp.code).toBe('GUARDRAIL_SECRET_DETECTED');

    const aws = evaluateContentGuardrails('Key is AKIAIOSFODNN7EXAMPLE');
    expect(aws.allowed).toBe(false);
    expect(aws.code).toBe('GUARDRAIL_SECRET_DETECTED');
  });

  it('blocks spam floods (excessive URLs, hashtags, or repeated chars)', () => {
    const manyLinks = evaluateContentGuardrails(
      'https://a.example https://b.example https://c.example https://d.example'
    );
    expect(manyLinks.allowed).toBe(false);
    expect(manyLinks.code).toBe('GUARDRAIL_SPAM_DETECTED');

    const spamRepeat = evaluateContentGuardrails('whaaaaaaaaaaaaaaaats up');
    expect(spamRepeat.allowed).toBe(false);
    expect(spamRepeat.code).toBe('GUARDRAIL_SPAM_DETECTED');
  });

  it('flags sensitive topics with viewer content warning instead of silent failure', () => {
    const decision = evaluateContentGuardrails('New finale spoiler inside! #cinema');
    expect(decision.allowed).toBe(true);
    expect(decision.status).toBe('flagged');
    expect(decision.contentWarning).toContain('Viewer discretion');
    expect(decision.tags).toEqual(['cinema']);
  });

  it('blocks dangerous URL schemes (javascript:, data:, protocol-relative)', () => {
    expect(validateSafeMediaOrWebUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateSafeMediaOrWebUrl('data:text/html,<svg onload=alert(1)>').valid).toBe(false);
    expect(validateSafeMediaOrWebUrl('//evil.example/x.png').valid).toBe(false);
    expect(validateSafeMediaOrWebUrl('/media/../etc/passwd', { allowRelativeMedia: true }).valid).toBe(false);
    expect(validateSafeMediaOrWebUrl('https://framenew.example/alex').valid).toBe(true);
    expect(validateSafeMediaOrWebUrl('/media/arches.jpg', { allowRelativeMedia: true }).valid).toBe(true);
  });

  it('extracts unique normalized hashtags up to 12', () => {
    expect(extractHashtags('Light #Design #Minimalism #design')).toEqual(['design', 'minimalism']);
  });

  it('validates image binary magic bytes against spoofed payloads', () => {
    const fakeJpg = Buffer.from('<svg onload=alert(1)>hello world</svg>');
    expect(detectImageExtensionFromMagicBytes(fakeJpg)).toBeNull();

    const realPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
    expect(detectImageExtensionFromMagicBytes(realPngHeader)).toBe('png');

    const realJpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
    expect(detectImageExtensionFromMagicBytes(realJpgHeader)).toBe('jpg');
  });
});
