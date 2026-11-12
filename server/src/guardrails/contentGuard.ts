export interface GuardrailDecision {
  allowed: boolean;
  status: 'clean' | 'flagged' | 'blocked';
  code?: string;
  reason?: string;
  sanitizedText: string;
  tags: string[];
  contentWarning: string | null;
}

const SECRET_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'GitHub token', regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/ },
  { label: 'GitHub fine-grained PAT', regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { label: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'API secret key', regex: /\bsk-(?:proj-|or-v1-)?[A-Za-z0-9_-]{20,}\b/ },
  { label: 'Private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'US SSN pattern', regex: /\b\d{3}-\d{2}-\d{4}\b/ },
];

const BLOCKED_ABUSE_PATTERNS: RegExp[] = [
  /\b(?:phishing-kit|steal\s+passwords|credential\s+dump|buy\s+stolen\s+cards)\b/i,
];

const SENSITIVE_CW_PATTERNS: RegExp[] = [
  /\b(?:spoiler|flashing\s+lights|graphic\s+accident|medical\s+procedure)\b/i,
];

export function stripHtmlAndControl(input: string): string {
  return input
    // Strip ASCII control characters except newline/tab
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Strip zero-width spoofing characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Strip raw HTML tags
    .replace(/<[^>]*>/g, '')
    .trim();
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_-]{2,32}/g) || [];
  const unique = new Set(matches.map((t) => t.slice(1).toLowerCase()));
  return [...unique].slice(0, 12);
}

export function validateSafeMediaOrWebUrl(
  rawUrl: string,
  options: { allowRelativeMedia?: boolean; allowEmpty?: boolean } = {}
): { valid: boolean; normalized: string; reason?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return options.allowEmpty
      ? { valid: true, normalized: '' }
      : { valid: false, normalized: '', reason: 'URL is required.' };
  }

  // Disallow protocol-relative or dangerous schemes immediately
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    trimmed.startsWith('//')
  ) {
    return { valid: false, normalized: '', reason: 'Unsafe URL scheme blocked by security guardrail.' };
  }

  if (options.allowRelativeMedia && (trimmed.startsWith('/media/') || trimmed.startsWith('/uploads/'))) {
    if (trimmed.includes('..') || /[\s<>"]/.test(trimmed)) {
      return { valid: false, normalized: '', reason: 'Invalid relative media path.' };
    }
    return { valid: true, normalized: trimmed };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, normalized: '', reason: 'Only http(s) URLs are allowed.' };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, normalized: '', reason: 'Malformed URL.' };
  }
}

export function evaluateContentGuardrails(
  rawText: string,
  options: { maxLength?: number; explicitContentWarning?: string | null } = {}
): GuardrailDecision {
  const maxLength = options.maxLength ?? 1000;
  const sanitizedText = stripHtmlAndControl(rawText).slice(0, maxLength);
  const tags = extractHashtags(sanitizedText);

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(sanitizedText)) {
      return {
        allowed: false,
        status: 'blocked',
        code: 'GUARDRAIL_SECRET_DETECTED',
        reason: `Blocked by privacy guardrail: detected potential ${pattern.label}. Never post credentials or sensitive IDs.`,
        sanitizedText,
        tags,
        contentWarning: null,
      };
    }
  }

  for (const abuse of BLOCKED_ABUSE_PATTERNS) {
    if (abuse.test(sanitizedText)) {
      return {
        allowed: false,
        status: 'blocked',
        code: 'GUARDRAIL_BLOCKED_CONTENT',
        reason: 'Blocked by safety guardrail: content violates community safety policy.',
        sanitizedText,
        tags,
        contentWarning: null,
      };
    }
  }

  const urlCount = (sanitizedText.match(/https?:\/\/\S+/gi) || []).length;
  const rawTagCount = (sanitizedText.match(/#[a-zA-Z0-9_-]+/g) || []).length;
  const hasRepeatSpam = /(.)\1{14,}/.test(sanitizedText);

  if (urlCount > 3 || rawTagCount > 12 || hasRepeatSpam) {
    return {
      allowed: false,
      status: 'blocked',
      code: 'GUARDRAIL_SPAM_DETECTED',
      reason: 'Blocked by anti-spam guardrail: too many links, hashtags, or repeated characters.',
      sanitizedText,
      tags,
      contentWarning: null,
    };
  }

  let contentWarning = options.explicitContentWarning ? stripHtmlAndControl(options.explicitContentWarning) : null;
  if (!contentWarning && SENSITIVE_CW_PATTERNS.some((p) => p.test(sanitizedText))) {
    contentWarning = 'Viewer discretion advised (auto-flagged sensitivity)';
  }

  return {
    allowed: true,
    status: contentWarning ? 'flagged' : 'clean',
    sanitizedText,
    tags,
    contentWarning: contentWarning || null,
  };
}
