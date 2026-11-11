import { proxyApiRequest } from '@/shared/api/api-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Same-origin reverse proxy: browser → web origin `/api/v1/*` → Nest.
 *
 * Uses runtime `API_INTERNAL_URL` (Coolify / Compose / root `.env`) so the
 * internal API hostname is not baked into the Next.js build and never appears
 * in browser bundles. Cookies and CSRF stay first-party on the web origin.
 *
 * Node `fetch` auto-decompresses gzip/br upstream bodies; response header
 * forwarding strips `Content-Encoding` / `Content-Length` so the browser never
 * sees compression metadata that no longer matches the body.
 */

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  const segments = Array.isArray(path) ? path : [];
  return proxyApiRequest(request, segments);
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
