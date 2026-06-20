'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'mana.accessToken';
const REFRESH_KEY = 'mana.refreshToken';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

/** Exchange the refresh token for a fresh access token. Returns false if it can't. */
async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (!data.accessToken || !data.refreshToken) return false;
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function rawRequest(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean },
): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.auth) {
    const token = getToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }
  return fetch(`${API_URL}/api${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  let res = await rawRequest(path, opts);

  // Access token likely expired — try a one-shot refresh, then retry.
  if (res.status === 401 && opts.auth && (await refreshTokens())) {
    res = await rawRequest(path, opts);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    // Refresh failed too (or none) — drop stale tokens so the UI re-prompts login.
    if (res.status === 401 && opts.auth) clearTokens();
    const message = (data && (data.message as string)) || `Request failed (${res.status})`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }
  return data as T;
}
