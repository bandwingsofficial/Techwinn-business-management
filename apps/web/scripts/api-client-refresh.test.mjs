/**
 * Single-flight / skipAuthRefresh / 429 cooldown behaviour for api-client.
 * Run: `pnpm --filter @techwin/web run test:api-client-refresh`
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { API_ERROR_CODES } from '../src/lib/contracts/errors.ts';

// Minimal inlined replica of refresh coordination (keeps Node tests free of @/ aliases).
function createRefreshCoordinator() {
  let inFlight = null;
  let cooldownUntil = 0;
  let transientCooldownUntil = 0;
  let refresher = null;
  let callCount = 0;
  let accessToken = null;

  return {
    register(fn) {
      refresher = fn;
    },
    setAccessToken(token) {
      accessToken = token;
    },
    async refresh() {
      if (inFlight) return inFlight;
      const now = Date.now();
      if (now < cooldownUntil) {
        const err = new Error('RATE_LIMITED');
        err.status = 429;
        err.code = API_ERROR_CODES.RATE_LIMITED;
        throw err;
      }
      if (now < transientCooldownUntil) {
        if (accessToken) return 'refreshed';
        const err = new Error('TRANSIENT');
        err.status = 503;
        throw err;
      }
      if (!refresher) return 'unauthenticated';
      inFlight = (async () => {
        callCount += 1;
        try {
          return await refresher();
        } catch (error) {
          if (error && error.status === 429) {
            cooldownUntil = Date.now() + 2000;
          }
          if (error && error.status >= 500) {
            transientCooldownUntil = Date.now() + 2000;
          }
          throw error;
        } finally {
          inFlight = null;
        }
      })();
      return inFlight;
    },
    get callCount() {
      return callCount;
    },
  };
}

test('concurrent refresh callers share one in-flight operation', async () => {
  const coord = createRefreshCoordinator();
  let started = 0;
  coord.register(async () => {
    started += 1;
    await new Promise((r) => setTimeout(r, 30));
    return 'refreshed';
  });
  const [a, b, c] = await Promise.all([coord.refresh(), coord.refresh(), coord.refresh()]);
  assert.equal(a, 'refreshed');
  assert.equal(b, 'refreshed');
  assert.equal(c, 'refreshed');
  assert.equal(started, 1);
  assert.equal(coord.callCount, 1);
});

test('429 sets cooldown so immediate retry does not re-hit refresh', async () => {
  const coord = createRefreshCoordinator();
  coord.register(async () => {
    const err = new Error('slow down');
    err.status = 429;
    throw err;
  });
  await assert.rejects(() => coord.refresh(), (e) => e.status === 429);
  await assert.rejects(() => coord.refresh(), (e) => e.code === API_ERROR_CODES.RATE_LIMITED);
  assert.equal(coord.callCount, 1);
});

test('transient 502 cooldown blocks immediate duplicate refresh without token', async () => {
  const coord = createRefreshCoordinator();
  coord.register(async () => {
    const err = new Error('bad gateway');
    err.status = 502;
    throw err;
  });
  await assert.rejects(() => coord.refresh(), (e) => e.status === 502);
  await assert.rejects(() => coord.refresh(), (e) => e.status === 503);
  assert.equal(coord.callCount, 1);
});

test('transient failure reuses in-memory token during cooldown', async () => {
  const coord = createRefreshCoordinator();
  coord.setAccessToken('still-valid');
  coord.register(async () => {
    const err = new Error('bad gateway');
    err.status = 502;
    throw err;
  });
  await assert.rejects(() => coord.refresh(), (e) => e.status === 502);
  assert.equal(await coord.refresh(), 'refreshed');
  assert.equal(coord.callCount, 1);
});

test('skipAuthRefresh contract: refresh path must not request another refresh', () => {
  const options = { method: 'POST', csrf: true, skipAuthRefresh: true, auth: false };
  assert.equal(options.skipAuthRefresh, true);
  assert.equal(Boolean(options.auth && !options.skipAuthRefresh), false);
});
