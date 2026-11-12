export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
  }
}

const TOKEN_STORAGE_KEY = 'framenew_jwt';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function getRetryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 10_000);
  }
  const cap = Math.min(400 * 2 ** attempt, 4000);
  return Math.floor(Math.random() * cap) + 150;
}

/**
 * Bounded, idempotency-aware API request wrapper respecting 429 Retry-After and transient 5xx.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  maxRetries = 2
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const replaySafe = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(method);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const headers = new Headers(options.headers);
    const token = getStoredToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!(options.body instanceof FormData) && options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(path, { ...options, headers });
    const text = await res.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      payload = {};
    }

    if (res.ok) {
      return payload as T;
    }

    const retryable = [408, 429, 500, 502, 503, 504].includes(res.status);
    if (!retryable || !replaySafe || attempt === maxRetries) {
      throw new ApiError(
        String(payload.error || `Request failed (${res.status})`),
        res.status,
        payload.code ? String(payload.code) : undefined
      );
    }

    const delay = getRetryDelayMs(res, attempt);
    await new Promise((r) => setTimeout(r, delay));
  }

  throw new ApiError('Request exhausted retries', 503);
}
