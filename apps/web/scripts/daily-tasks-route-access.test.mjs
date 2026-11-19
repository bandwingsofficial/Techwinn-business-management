/**
 * Daily Tasks route access must be portal-agnostic: org viewers get the organization board,
 * anyone who may view their own tasks gets the same page in personal scope.
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

/** Mirrors of `src/lib/contracts/task-visibility.ts`. */
function canViewOrganizationDailyTasks(permissions) {
  return permissions.has('project_management.daily_tasks.view_all');
}

function canViewOwnDailyTasks(permissions) {
  return permissions.has('tasks.read') || permissions.has('project_management.daily_tasks.view');
}

/** Mirror of the daily-task branch of `canAccessAppPath` in `app-route-permissions.ts`. */
function canAccessAppPath(pathname, permissions, portalSegment) {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const pathPortal = path.split('/').filter(Boolean)[0] ?? null;
  if (portalSegment && pathPortal && pathPortal !== portalSegment) {
    return false;
  }
  if (isOrganizationDailyTasksBoardPath(path)) {
    if (canViewOrganizationDailyTasks(permissions)) return true;
    if (!path.startsWith('/employee/')) return canViewOwnDailyTasks(permissions);
    return ['tasks.read', 'project_management.daily_tasks.view'].some((k) => permissions.has(k));
  }
  return false;
}

const viewPage = new Set(['project_management.daily_tasks.view']);
const viewAll = new Set([
  'project_management.daily_tasks.view',
  'project_management.daily_tasks.view_all',
]);

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
    assert.equal(canAccessAppPath(path, viewPage, portal), true);
    assert.equal(canAccessAppPath(path, viewAll, portal), true);
    assert.equal(canonicalPermissionPath(path), '/admin/daily-tasks');
  });
}

test('employee portal daily tasks open with View Page alone (own scope)', () => {
  assert.equal(canAccessAppPath('/employee/daily-tasks', viewPage, 'employee'), true);
  assert.equal(
    canAccessAppPath('/employee/daily-tasks', new Set(['tasks.read']), 'employee'),
    true,
  );
});

test('without permission, daily tasks denied', () => {
  assert.equal(
    canAccessAppPath('/project-manager/daily-tasks', new Set(), 'project-manager'),
    false,
  );
  assert.equal(canAccessAppPath('/employee/daily-tasks', new Set(), 'employee'), false);
});
