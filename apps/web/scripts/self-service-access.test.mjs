/**
 * Run: `node --experimental-strip-types --test scripts/self-service-access.test.mjs`
 *
 * Mirrors membership + route access rules for Super Admin vs employee self-service.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

/** @typedef {{ platformRole: string, membershipRoles: readonly unknown[], sessionEmployee: { id: string } | null }} Access */

function canAccessWorkspaceDashboard(context) {
  if (context.platformRole === 'SUPER_ADMIN') return true;
  return context.membershipRoles.some((role) => role.key === 'owner' || role.key === 'admin');
}

function canUseEmployeeSelfService(context) {
  if (context.platformRole === 'SUPER_ADMIN') return false;
  return context.sessionEmployee !== null;
}

function canAccessAppPath(pathname, permissions, access) {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (access && (path === '/admin' || path === '/admin/dashboard')) {
    if (!canAccessWorkspaceDashboard(access)) return false;
  }
  if (access && (path === '/employee' || path.startsWith('/employee/'))) {
    if (!canUseEmployeeSelfService(access)) return false;
  }
  if (path === '/employee/leave') {
    return (
      permissions.has('leave.requests.read_own') ||
      permissions.has('leave.balances.read_own') ||
      permissions.has('leave.requests.create')
    );
  }
  if (path === '/admin/leave') {
    return permissions.has('leave.requests.read_all');
  }
  return true;
}

function shouldShowNavHref(href, permissions, access) {
  if (access && href.startsWith('/employee') && !canUseEmployeeSelfService(access)) {
    return false;
  }
  return canAccessAppPath(href, permissions, access);
}

const ALL_PERMS = new Set([
  'leave.balances.read_own',
  'leave.requests.read_own',
  'leave.requests.create',
  'leave.requests.read_all',
  'attendance.view_own',
  'attendance.view_all',
  'calendar.view',
  'tasks.read',
]);

test('Super Admin never uses employee self-service even with all permissions', () => {
  /** @type {Access} */
  const access = {
    platformRole: 'SUPER_ADMIN',
    membershipRoles: [{ key: 'owner' }],
    sessionEmployee: null,
  };
  assert.equal(canUseEmployeeSelfService(access), false);
  assert.equal(shouldShowNavHref('/employee/leave', ALL_PERMS, access), false);
  assert.equal(shouldShowNavHref('/employee/attendance', ALL_PERMS, access), false);
  assert.equal(shouldShowNavHref('/employee/dashboard', ALL_PERMS, access), false);
  assert.equal(canAccessAppPath('/admin/leave', ALL_PERMS, access), true);
  assert.equal(canAccessAppPath('/admin/dashboard', ALL_PERMS, access), true);
});

test('Super Admin with linked employee still cannot open My Workspace routes', () => {
  /** @type {Access} */
  const access = {
    platformRole: 'SUPER_ADMIN',
    membershipRoles: [{ key: 'owner' }],
    sessionEmployee: { id: 'emp-1' },
  };
  assert.equal(canUseEmployeeSelfService(access), false);
  assert.equal(canAccessAppPath('/employee/leave', ALL_PERMS, access), false);
});

test('Organization Admin without employee profile does not see My Workspace', () => {
  /** @type {Access} */
  const access = {
    platformRole: 'ORGANIZATION_MEMBER',
    membershipRoles: [{ key: 'admin' }],
    sessionEmployee: null,
  };
  assert.equal(canUseEmployeeSelfService(access), false);
  assert.equal(shouldShowNavHref('/employee/leave', ALL_PERMS, access), false);
  assert.equal(canAccessAppPath('/admin/dashboard', ALL_PERMS, access), true);
});

test('Employee with linked profile and permissions sees My Leave', () => {
  /** @type {Access} */
  const access = {
    platformRole: 'ORGANIZATION_MEMBER',
    membershipRoles: [{ key: 'employee' }],
    sessionEmployee: { id: 'emp-9' },
  };
  assert.equal(canUseEmployeeSelfService(access), true);
  assert.equal(shouldShowNavHref('/employee/leave', ALL_PERMS, access), true);
  assert.equal(canAccessAppPath('/admin/dashboard', ALL_PERMS, access), false);
});

test('Organization Admin is not automatically platform Super Admin', () => {
  /** @type {Access} */
  const access = {
    platformRole: 'ORGANIZATION_MEMBER',
    membershipRoles: [{ key: 'admin' }],
    sessionEmployee: null,
  };
  assert.notEqual(access.platformRole, 'SUPER_ADMIN');
  assert.equal(canAccessWorkspaceDashboard(access), true);
  assert.equal(canUseEmployeeSelfService(access), false);
});
