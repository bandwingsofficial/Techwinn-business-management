import { PLATFORM_CSRF_COOKIE, PLATFORM_CSRF_HEADER } from '@techwin/contracts';
import { resolveApiBaseUrl } from './resolve-api-base-url';

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Browser calls must stay on the web origin so `SameSite=Strict` auth cookies
 * remain first-party. A loopback `NEXT_PUBLIC_API_BASE_URL` on another port
 * (e.g. :4000 while the app is on :3000) is same-site but cross-origin: the
 * CSRF cookie cannot be read from `document.cookie` and refresh never works.
 * Leave `NEXT_PUBLIC_API_BASE_URL` empty so requests hit `/api/v1/*` on the
 * web origin; the App Router proxies to Nest via `API_INTERNAL_URL`.
 */
export function resolveClientApiBaseUrl(): string {
  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : null;
  return resolveApiBaseUrl(configuredApiBaseUrl, pageOrigin);
}

export const apiConfig = {
  get baseUrl(): string {
    return resolveClientApiBaseUrl();
  },
  requestTimeoutMs: 15_000,
  csrfCookie: PLATFORM_CSRF_COOKIE,
  csrfHeader: PLATFORM_CSRF_HEADER,
  /** Web Locks name that serializes refresh-token rotation across browser tabs. */
  refreshLockName: 'techwin:platform-session-refresh',
} as const;
