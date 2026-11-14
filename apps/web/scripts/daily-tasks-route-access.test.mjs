/**
 * Organization Daily Tasks route access must be portal-agnostic.
 * Run: `node --experimental-strip-types --test scripts/daily-tasks-route-access.test.mjs`
 */
import assert from 'node:assert/strict';
import test from 'node:test';

function canonicalPermissionPath(pathname) {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 2) return normalized;
  const head = parts[0];
  if (head === 'admin' || head === 'employee') return normalized;
  if (head === 'super-admin' || head === 'owner') {
    return `/admin/${parts.slice(1).join('/')}`;
  }
  return `/admin/${parts.slice(1).join('/')}`;
}

function workspaceModuleSegment(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length >= 2 ? parts[1] : null;
}

function isOrganizationDailyTasksBoardPath(pathname) {
  const module = workspaceModuleSegment(pathname);
  return module === 'daily-tasks' || module === 'my-tasks';
}

function canViewOrganizationDailyTasks(permissions) {
  return permissions.has('project_management.daily_tasks.view');
}

function canAccessAppPath(pathname, permissions, portalSegment) {
  const path =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const pathPortal = path.split('/').filter(Boolean)[0] ?? null;
  if (portalSegment && pathPortal && pathPortal !== portalSegment) {
    return false;
  }
  if (isOrganizationDailyTasksBoardPath(path)) {
    return canViewOrganizationDailyTasks(permissions);
  }
  const canonical = canonicalPermissionPath(path);
  if (canonical === '/admin/daily-tasks') {
    return canViewOrganizationDailyTasks(permissions);
  }
  return false;
}

const dailyTasksPerm = new Set(['project_management.daily_tasks.view']);

const paths = [
  ['/admin/daily-tasks', 'admin'],
  ['/project-manager/daily-tasks', 'project-manager'],
  ['/super-admin/daily-tasks', 'super-admin'],
  ['/test/daily-tasks', 'test'],
  ['/sales/daily-tasks', 'sales'],
  ['/financial/daily-tasks', 'financial'],
];

for (const [path, portal] of paths) {
  test(`daily tasks allowed for ${portal} at ${path}`, () => {
    assert.equal(canAccessAppPath(path, dailyTasksPerm, portal), true);
    assert.equal(canonicalPermissionPath(path), '/admin/daily-tasks');
  });
}

test('without permission, org daily tasks denied', () => {
  assert.equal(canAccessAppPath('/project-manager/daily-tasks', new Set(), 'project-manager'), false);
});