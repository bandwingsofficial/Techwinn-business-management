/**
 * Header filtering for the same-origin `/api/v1` App Router proxy.
 *
 * Node.js `fetch` (undici) automatically decompresses gzip / deflate / br
 * response bodies. Forwarding the upstream `Content-Encoding` (or a stale
 * `Content-Length`) with that already-decoded body causes browsers to fail
 * with ERR_CONTENT_DECODING_FAILED.
 */

/** Headers that must not be forwarded on either the request or the response. */
export const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
]);

/**
 * Response headers that describe the upstream wire encoding / length.
 * Always strip after Node `fetch` — the body we forward is already decoded
 * (or streamed as opaque decoded bytes), so these must not reach the browser.
 */
export const UPSTREAM_COMPRESSION_HEADERS = new Set([
  'content-encoding',
  'content-length',
]);

const RESPONSE_DROP = new Set([...HOP_BY_HOP_HEADERS, ...UPSTREAM_COMPRESSION_HEADERS]);

export function shouldForwardRequestHeader(name: string): boolean {
  return !HOP_BY_HOP_HEADERS.has(name.toLowerCase());
}

export function shouldForwardResponseHeader(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower === 'set-cookie') return false;
  return !RESPONSE_DROP.has(lower);
}

/** Build outbound request headers for the Nest upstream. */
export function buildUpstreamRequestHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!shouldForwardRequestHeader(key)) return;
    headers.set(key, value);
  });
  return headers;
}

/**
 * Build browser-facing response headers from an upstream `fetch` Response.
 * Strips hop-by-hop and compression metadata; preserves multi-value Set-Cookie.
 */
export function buildBrowserResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!shouldForwardResponseHeader(key)) return;
    headers.set(key, value);
  });

  const setCookies =
    typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
  for (const cookie of setCookies) {
    headers.append('set-cookie', cookie);
  }
  return headers;
}

/** True when a header name is compression / length metadata that must not leak. */
export function isStaleCompressionMetadata(name: string): boolean {
  return UPSTREAM_COMPRESSION_HEADERS.has(name.toLowerCase());
}
