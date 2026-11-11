/**
 * Tests for `/api/v1` proxy header sanitization (compression + cookies).
 * Run: `pnpm --filter @techwin/web run test:proxy-headers`
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import {
  buildBrowserResponseHeaders,
  buildUpstreamRequestHeaders,
  isStaleCompressionMetadata,
  shouldForwardRequestHeader,
  shouldForwardResponseHeader,
} from '../src/shared/api/proxy-headers.ts';

test('strips hop-by-hop request headers including host', () => {
  assert.equal(shouldForwardRequestHeader('Host'), false);
  assert.equal(shouldForwardRequestHeader('connection'), false);
  assert.equal(shouldForwardRequestHeader('authorization'), true);
  assert.equal(shouldForwardRequestHeader('cookie'), true);
  assert.equal(shouldForwardRequestHeader('accept-encoding'), true);
});

test('strips content-encoding and content-length from responses', () => {
  assert.equal(shouldForwardResponseHeader('content-encoding'), false);
  assert.equal(shouldForwardResponseHeader('Content-Encoding'), false);
  assert.equal(shouldForwardResponseHeader('content-length'), false);
  assert.equal(shouldForwardResponseHeader('transfer-encoding'), false);
  assert.equal(isStaleCompressionMetadata('content-encoding'), true);
  assert.equal(isStaleCompressionMetadata('content-length'), true);
});

test('preserves security and API metadata response headers', () => {
  assert.equal(shouldForwardResponseHeader('content-type'), true);
  assert.equal(shouldForwardResponseHeader('cache-control'), true);
  assert.equal(shouldForwardResponseHeader('x-request-id'), true);
  assert.equal(shouldForwardResponseHeader('vary'), true);
  assert.equal(shouldForwardResponseHeader('x-frame-options'), true);
});

test('gzip: decoded body must not retain content-encoding', () => {
  const json = JSON.stringify({ permissions: ['org.read'] });
  const compressed = gzipSync(Buffer.from(json, 'utf8'));
  // Simulate Node fetch after auto-decompress: decoded body + stale encoding header.
  const upstream = new Response(json, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-encoding': 'gzip',
      'content-length': String(compressed.byteLength),
      vary: 'Accept-Encoding',
      'cache-control': 'no-store',
      'x-request-id': 'req-gzip-1',
    },
  });

  const out = buildBrowserResponseHeaders(upstream);
  assert.equal(out.get('content-encoding'), null);
  assert.equal(out.get('content-length'), null);
  assert.equal(out.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(out.get('cache-control'), 'no-store');
  assert.equal(out.get('x-request-id'), 'req-gzip-1');
  assert.equal(out.get('vary'), 'Accept-Encoding');
});

test('brotli: decoded body must not retain content-encoding br', () => {
  const json = JSON.stringify({ ok: true });
  const compressed = brotliCompressSync(Buffer.from(json, 'utf8'));
  const upstream = new Response(json, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-encoding': 'br',
      'content-length': String(compressed.byteLength),
    },
  });

  const out = buildBrowserResponseHeaders(upstream);
  assert.equal(out.get('content-encoding'), null);
  assert.equal(out.get('content-length'), null);
  assert.equal(out.get('content-type'), 'application/json; charset=utf-8');
});

test('uncompressed JSON: no compression headers to strip', () => {
  const upstream = new Response('{"a":1}', {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-request-id': 'plain-1',
    },
  });
  const out = buildBrowserResponseHeaders(upstream);
  assert.equal(out.get('content-encoding'), null);
  assert.equal(out.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(out.get('x-request-id'), 'plain-1');
});

test('empty / 204-style response: no stale length or encoding', () => {
  const upstream = new Response(null, {
    status: 204,
    headers: {
      'content-encoding': 'gzip',
      'content-length': '0',
      'cache-control': 'no-store',
    },
  });
  const out = buildBrowserResponseHeaders(upstream);
  assert.equal(out.get('content-encoding'), null);
  assert.equal(out.get('content-length'), null);
  assert.equal(out.get('cache-control'), 'no-store');
});

test('error responses preserve status metadata headers without compression', () => {
  const body = JSON.stringify({
    statusCode: 401,
    error: { code: 'UNAUTHENTICATED', message: 'Unauthorized' },
  });
  const upstream = new Response(body, {
    status: 401,
    statusText: 'Unauthorized',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-encoding': 'gzip',
      'content-length': '999',
      'x-request-id': 'err-1',
    },
  });
  const out = buildBrowserResponseHeaders(upstream);
  assert.equal(out.get('content-encoding'), null);
  assert.equal(out.get('content-length'), null);
  assert.equal(out.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(out.get('x-request-id'), 'err-1');
});

test('multiple Set-Cookie headers are preserved', () => {
  const upstreamHeaders = new Headers();
  upstreamHeaders.append(
    'set-cookie',
    'tw_platform_rt=refresh-token; Path=/api/v1/auth/platform; HttpOnly; SameSite=Strict',
  );
  upstreamHeaders.append(
    'set-cookie',
    'tw_platform_csrf=csrf-token; Path=/; SameSite=Strict',
  );
  upstreamHeaders.set('content-type', 'application/json; charset=utf-8');
  upstreamHeaders.set('content-encoding', 'gzip');

  const upstream = new Response('{"accessToken":"x"}', {
    status: 200,
    headers: upstreamHeaders,
  });

  const out = buildBrowserResponseHeaders(upstream);
  const cookies = out.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.match(cookies[0], /tw_platform_rt=/);
  assert.match(cookies[1], /tw_platform_csrf=/);
  assert.equal(out.get('content-encoding'), null);
});

test('org-access permissions response shape: gzip metadata stripped', () => {
  // Mirrors production failure: GET /api/v1/org-access/me/permissions
  const payload = JSON.stringify({
    organizationId: '00000000-0000-0000-0000-000000000001',
    permissions: ['org-access.me.read', 'employees.read'],
  });
  const upstream = new Response(payload, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-encoding': 'gzip',
      'content-length': '128',
      vary: 'Accept-Encoding',
      'cache-control': 'no-store',
    },
  });

  const out = buildBrowserResponseHeaders(upstream);
  assert.equal(out.has('content-encoding'), false);
  assert.equal(out.has('content-length'), false);
  assert.equal(out.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(out.get('cache-control'), 'no-store');
});

test('buildUpstreamRequestHeaders drops host and connection', () => {
  const incoming = new Headers({
    host: 'crm.techwinn.com',
    connection: 'keep-alive',
    authorization: 'Bearer abc',
    cookie: 'tw_platform_csrf=x',
    'content-type': 'application/json',
  });
  const out = buildUpstreamRequestHeaders(incoming);
  assert.equal(out.get('host'), null);
  assert.equal(out.get('connection'), null);
  assert.equal(out.get('authorization'), 'Bearer abc');
  assert.equal(out.get('cookie'), 'tw_platform_csrf=x');
});
