import {
  ApiInternalUrlError,
  resolveApiInternalUrl,
} from '@/shared/api/resolve-api-base-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Same-origin reverse proxy: browser → web origin `/api/v1/*` → Nest.
 *
 * Uses runtime `API_INTERNAL_URL` (Coolify / Compose / root `.env`) so the
 * internal API hostname is not baked into the Next.js build and never appears
 * in browser bundles. Cookies and CSRF stay first-party on the web origin.
 *
 * This is intentionally an App Router handler — not `next.config` rewrites —
 * so Coolify can change the internal hostname without rebuilding, and so
 * multi-value `Set-Cookie` responses are forwarded correctly.
 */

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

function buildUpstreamUrl(
  request: Request,
  pathSegments: readonly string[],
  upstreamOrigin: string,
): string {
  const joined = pathSegments.map(encodeURIComponent).join('/');
  const incoming = new URL(request.url);
  return `${upstreamOrigin}/api/v1/${joined}${incoming.search}`;
}

function forwardRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.set(key, value);
  });
  return headers;
}

function forwardResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === 'set-cookie') return;
    headers.set(key, value);
  });
  const setCookies =
    typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
  for (const cookie of setCookies) {
    headers.append('set-cookie', cookie);
  }
  return headers;
}

function misconfiguredResponse(error: unknown): Response {
  const message =
    error instanceof ApiInternalUrlError
      ? error.message
      : 'API proxy is misconfigured.';
  return Response.json(
    {
      statusCode: 503,
      error: {
        code: 'PROXY_MISCONFIGURED',
        message,
      },
    },
    { status: 503 },
  );
}

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  let upstreamOrigin: string;
  try {
    upstreamOrigin = resolveApiInternalUrl(process.env.API_INTERNAL_URL);
  } catch (error) {
    return misconfiguredResponse(error);
  }

  const { path } = await context.params;
  const segments = Array.isArray(path) ? path : [];
  const target = buildUpstreamUrl(request, segments, upstreamOrigin);
  const method = request.method.toUpperCase();
  const headers = forwardRequestHeaders(request);
  const hasBody = method !== 'GET' && method !== 'HEAD';

  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  };
  if (hasBody) {
    init.body = request.body;
    init.duplex = 'half';
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return Response.json(
      {
        statusCode: 502,
        error: {
          code: 'BAD_GATEWAY',
          message: 'Unable to reach the API service.',
        },
      },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: forwardResponseHeaders(upstream),
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
