/**
 * Exercises the same proxy response assembly used by
 * `src/app/api/v1/[...path]/route.ts` → `proxyApiRequest`.
 * Covers GET /api/v1/org-access/me/permissions (production decoding failure).
 *
 * Run: `pnpm --filter @techwin/web run test:proxy-route`
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { resolveApiInternalUrl } from '../src/shared/api/resolve-api-base-url.ts';
import {
  buildBrowserResponseHeaders,
  buildUpstreamRequestHeaders,
} from '../src/shared/api/proxy-headers.ts';

/**
 * Mirrors `proxyApiRequest` (apps/web/src/shared/api/api-proxy.ts) for Node tests
 * without relying on TypeScript path aliases / extensionless ESM imports.
 */
async function runProxy(request, pathSegments, fetchImpl) {
  const upstreamOrigin = resolveApiInternalUrl('http://127.0.0.1:4000', {
    nodeEnv: 'development',
  });
  const joined = pathSegments.map(encodeURIComponent).join('/');
  const incoming = new URL(request.url);
  const target = `${upstreamOrigin}/api/v1/${joined}${incoming.search}`;
  const method = request.method.toUpperCase();
  const headers = buildUpstreamRequestHeaders(request.headers);
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const init = {
    method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  };
  if (hasBody) {
    init.body = request.body;
    init.duplex = 'half';
  }

  let upstream;
  try {
    upstream = await fetchImpl(target, init);
  } catch {
    return Response.json(
      {
        statusCode: 502,
        error: { code: 'BAD_GATEWAY', message: 'Unable to reach the API service.' },
      },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildBrowserResponseHeaders(upstream),
  });
}

test('GET org-access/me/permissions through proxy strips gzip encoding', async () => {
  const payload = JSON.stringify({
    organizationId: '00000000-0000-0000-0000-000000000001',
    permissions: ['employees.read'],
  });
  const gzipped = gzipSync(Buffer.from(payload, 'utf8'));
  let upstreamUrl = '';

  const fetchImpl = async (url) => {
    upstreamUrl = String(url);
    return new Response(payload, {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-encoding': 'gzip',
        'content-length': String(gzipped.byteLength),
        vary: 'Accept-Encoding',
        'cache-control': 'no-store',
        'x-request-id': 'perm-1',
      },
    });
  };

  const request = new Request('http://localhost:3000/api/v1/org-access/me/permissions', {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: 'Bearer test-token',
      'accept-encoding': 'gzip, deflate, br',
    },
  });

  const response = await runProxy(request, ['org-access', 'me', 'permissions'], fetchImpl);

  assert.equal(
    upstreamUrl,
    'http://127.0.0.1:4000/api/v1/org-access/me/permissions',
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-encoding'), null);
  assert.equal(response.headers.get('content-length'), null);
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-request-id'), 'perm-1');

  const text = await response.text();
  assert.equal(text, payload);
  assert.deepEqual(JSON.parse(text).permissions, ['employees.read']);
});

test('proxy preserves 401 body and strips compression metadata', async () => {
  const payload = JSON.stringify({
    statusCode: 401,
    error: { code: 'UNAUTHENTICATED', message: 'Unauthorized' },
  });

  const response = await runProxy(
    new Request('http://localhost:3000/api/v1/org-access/me/permissions'),
    ['org-access', 'me', 'permissions'],
    async () =>
      new Response(payload, {
        status: 401,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'content-encoding': 'br',
          'content-length': '42',
        },
      }),
  );

  assert.equal(response.status, 401);
  assert.equal(response.headers.get('content-encoding'), null);
  assert.equal(response.headers.get('content-length'), null);
  assert.equal(await response.text(), payload);
});

test('proxy forwards multiple Set-Cookie values without content-encoding', async () => {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
  headers.append('set-cookie', 'tw_platform_rt=a; Path=/api/v1/auth/platform; HttpOnly');
  headers.append('set-cookie', 'tw_platform_csrf=b; Path=/');
  headers.set('content-encoding', 'gzip');

  const response = await runProxy(
    new Request('http://localhost:3000/api/v1/auth/platform/verify-totp', {
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'application/json' },
    }),
    ['auth', 'platform', 'verify-totp'],
    async () => new Response('{"accessToken":"tok"}', { status: 200, headers }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-encoding'), null);
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.match(cookies[0], /tw_platform_rt=/);
  assert.match(cookies[1], /tw_platform_csrf=/);
});

test('upstream network failure returns 502 without leaking encoding headers', async () => {
  const response = await runProxy(
    new Request('http://localhost:3000/api/v1/org-access/me/permissions'),
    ['org-access', 'me', 'permissions'],
    async () => {
      throw new TypeError('fetch failed');
    },
  );
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('content-encoding'), null);
  const body = await response.json();
  assert.equal(body.error.code, 'BAD_GATEWAY');
});
