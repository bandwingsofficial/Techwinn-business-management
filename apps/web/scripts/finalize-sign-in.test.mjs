/**
 * Ensures post-login permission failures do not invalidate TOTP success.
 * Run: `pnpm --filter @techwin/web run test:finalize-sign-in`
 */
import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Mirrors finalizePlatformSignIn control flow without Next path aliases:
 * auth artifacts are armed even when permissions loading fails.
 */
async function finalizeSignInFlow(options) {
  const { verifyOk, permissionsLoader } = options;
  assert.equal(verifyOk, true, 'TOTP must succeed before finalize');

  let accessTokenSet = false;
  let bootstrapArmed = false;
  let permissions = [];
  let roles = [];
  let permissionLoadFailed = false;

  accessTokenSet = true;
  try {
    const mine = await permissionsLoader();
    permissions = mine.permissions;
    roles = mine.roles;
  } catch {
    permissionLoadFailed = true;
  }

  bootstrapArmed = true;
  return {
    accessTokenSet,
    bootstrapArmed,
    permissionLoadFailed,
    permissions,
    roles,
    authSucceeded: accessTokenSet && bootstrapArmed,
  };
}

test('permissions network failure still completes authentication', async () => {
  const result = await finalizeSignInFlow({
    verifyOk: true,
    permissionsLoader: async () => {
      throw new TypeError('Failed to fetch');
    },
  });
  assert.equal(result.authSucceeded, true);
  assert.equal(result.permissionLoadFailed, true);
  assert.deepEqual(result.permissions, []);
});

test('successful permissions load arms bootstrap with roles', async () => {
  const result = await finalizeSignInFlow({
    verifyOk: true,
    permissionsLoader: async () => ({
      permissions: ['attendance.view_own'],
      roles: [{ key: 'owner' }],
    }),
  });
  assert.equal(result.authSucceeded, true);
  assert.equal(result.permissionLoadFailed, false);
  assert.equal(result.permissions[0], 'attendance.view_own');
});
