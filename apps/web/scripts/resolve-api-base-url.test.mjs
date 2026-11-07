/**
 * Node built-in tests for API URL resolution.
 * Run: `pnpm --filter @techwin/web run test:api-url`
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiInternalUrlError,
  isLoopbackHost,
  normalizeApiBaseUrl,
  resolveApiBaseUrl,
  resolveApiInternalUrl,
} from '../src/shared/api/resolve-api-base-url.ts';

test('empty NEXT_PUBLIC_API_BASE_URL → same-origin (empty base)', () => {
  assert.equal(resolveApiBaseUrl('', 'http://localhost:3000'), '');
  assert.equal(resolveApiBaseUrl(undefined, 'https://crm.techwinn.com'), '');
});

test('loopback cross-port public API is forced to same-origin proxy', () => {
  assert.equal(resolveApiBaseUrl('http://localhost:4000', 'http://localhost:3000'), '');
});

test('same-origin configured base is preserved', () => {
  assert.equal(
    resolveApiBaseUrl('https://crm.techwinn.com', 'https://crm.techwinn.com'),
    'https://crm.techwinn.com',
  );
});

test('production public API origin is preserved when intentionally configured', () => {
  assert.equal(
    resolveApiBaseUrl('https://api2.techwinn.com', 'https://crm.techwinn.com'),
    'https://api2.techwinn.com',
  );
});

test('normalize strips trailing slashes', () => {
  assert.equal(normalizeApiBaseUrl('https://api2.techwinn.com/'), 'https://api2.techwinn.com');
});

test('API_INTERNAL_URL defaults to loopback only outside production', () => {
  assert.equal(resolveApiInternalUrl(undefined, { nodeEnv: 'development' }), 'http://127.0.0.1:4000');
  assert.equal(resolveApiInternalUrl('', { nodeEnv: 'development' }), 'http://127.0.0.1:4000');
  assert.equal(resolveApiInternalUrl('http://api:4000/', { nodeEnv: 'development' }), 'http://api:4000');
});

test('API_INTERNAL_URL strips trailing slash and keeps docker hostname', () => {
  assert.equal(
    resolveApiInternalUrl('http://api:4000/', { nodeEnv: 'production' }),
    'http://api:4000',
  );
});

test('missing API_INTERNAL_URL fails clearly in production', () => {
  assert.throws(
    () => resolveApiInternalUrl(undefined, { nodeEnv: 'production' }),
    (error) => error instanceof ApiInternalUrlError && /required in production/i.test(error.message),
  );
  assert.throws(
    () => resolveApiInternalUrl('   ', { nodeEnv: 'production' }),
    ApiInternalUrlError,
  );
});

test('production rejects loopback API_INTERNAL_URL', () => {
  assert.throws(
    () => resolveApiInternalUrl('http://localhost:4000', { nodeEnv: 'production' }),
    (error) => error instanceof ApiInternalUrlError && /loopback/i.test(error.message),
  );
  assert.throws(
    () => resolveApiInternalUrl('http://127.0.0.1:4000', { nodeEnv: 'production' }),
    ApiInternalUrlError,
  );
});

test('API_INTERNAL_URL must be http(s) origin without path', () => {
  assert.throws(
    () => resolveApiInternalUrl('ftp://api:4000', { nodeEnv: 'development' }),
    ApiInternalUrlError,
  );
  assert.throws(
    () => resolveApiInternalUrl('http://api:4000/api/v1', { nodeEnv: 'development' }),
    ApiInternalUrlError,
  );
  assert.throws(
    () => resolveApiInternalUrl('not-a-url', { nodeEnv: 'development' }),
    ApiInternalUrlError,
  );
  assert.throws(
    () => resolveApiInternalUrl('http://user:pass@api:4000', { nodeEnv: 'development' }),
    ApiInternalUrlError,
  );
});

test('https internal URL is accepted', () => {
  assert.equal(
    resolveApiInternalUrl('https://api.internal.example/', { nodeEnv: 'production' }),
    'https://api.internal.example',
  );
});

test('isLoopbackHost recognizes local hosts', () => {
  assert.equal(isLoopbackHost('localhost'), true);
  assert.equal(isLoopbackHost('127.0.0.1'), true);
  assert.equal(isLoopbackHost('api2.techwinn.com'), false);
});
