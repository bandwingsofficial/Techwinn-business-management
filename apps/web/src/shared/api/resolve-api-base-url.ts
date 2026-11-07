/**
 * Resolves the browser/client API base URL for `apiRequest`.
 *
 * Empty string = same-origin (recommended). The Next.js app then serves
 * `/api/v1/*` via the App Router proxy (`app/api/v1/[...path]/route.ts`),
 * which forwards to Nest using runtime `API_INTERNAL_URL`.
 *
 * Never put secrets in `NEXT_PUBLIC_*`. Do not point the browser at a
 * different origin in production unless CORS + cookies are deliberately
 * designed for that (this app uses SameSite=Strict first-party cookies).
 */

export class ApiInternalUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiInternalUrlError';
  }
}

export function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
}

export function normalizeApiBaseUrl(value: string | undefined | null): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

/**
 * @param configured - raw `NEXT_PUBLIC_API_BASE_URL`
 * @param pageOrigin - `window.location.origin` in the browser; omit on server
 */
export function resolveApiBaseUrl(
  configured: string | undefined | null,
  pageOrigin?: string | null,
): string {
  const base = normalizeApiBaseUrl(configured);
  if (!base) return '';

  // Server components / RSC should not call Nest directly via this helper —
  // browser and client hooks use same-origin proxy. If a public base is set,
  // return it unchanged on the server.
  if (!pageOrigin) return base;

  try {
    const api = new URL(base, pageOrigin);
    if (api.origin === new URL(pageOrigin).origin) return base;
    if (isLoopbackHost(api.hostname) && isLoopbackHost(new URL(pageOrigin).hostname)) {
      // Cross-port loopback breaks CSRF cookie readability; force same-origin proxy.
      return '';
    }
  } catch {
    return base;
  }
  return base;
}

export type ResolveApiInternalUrlOptions = {
  /** Defaults to `process.env.NODE_ENV`. */
  readonly nodeEnv?: string | undefined;
};

/**
 * Nest upstream origin for the Next.js `/api/v1` proxy (server-only).
 *
 * - Development: defaults to `http://127.0.0.1:4000` when unset.
 * - Production: throws {@link ApiInternalUrlError} when missing or invalid.
 * - Always strips trailing slashes; requires `http:` or `https:` origin only.
 */
export function resolveApiInternalUrl(
  value: string | undefined | null,
  options?: ResolveApiInternalUrlOptions,
): string {
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV;
  const trimmed = (value ?? '').trim().replace(/\/+$/, '');

  if (!trimmed) {
    if (nodeEnv === 'production') {
      throw new ApiInternalUrlError(
        'API_INTERNAL_URL is required in production. Set it to the NestJS service URL on the Docker/Coolify network (e.g. http://<api-hostname>:4000). Do not use localhost across containers.',
      );
    }
    return 'http://127.0.0.1:4000';
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ApiInternalUrlError(
      `API_INTERNAL_URL must be a valid absolute URL (got "${trimmed}").`,
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ApiInternalUrlError(
      `API_INTERNAL_URL must use http: or https: (got "${parsed.protocol}").`,
    );
  }

  if (parsed.username || parsed.password) {
    throw new ApiInternalUrlError(
      'API_INTERNAL_URL must not include credentials.',
    );
  }

  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new ApiInternalUrlError(
      `API_INTERNAL_URL must be an origin only with no path (got "${parsed.pathname}").`,
    );
  }

  if (parsed.search || parsed.hash) {
    throw new ApiInternalUrlError(
      'API_INTERNAL_URL must not include query parameters or a hash.',
    );
  }

  if (nodeEnv === 'production' && isLoopbackHost(parsed.hostname)) {
    throw new ApiInternalUrlError(
      `API_INTERNAL_URL must not use a loopback host in production (got "${parsed.hostname}"). Use the Coolify/Docker internal API hostname on port 4000.`,
    );
  }

  // Canonical origin form — never a trailing slash.
  return parsed.origin;
}
