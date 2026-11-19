/**
 * Daily Tasks data scope must route org viewers to org APIs and everyone else to `/my`.
 * Run: `node --experimental-strip-types --test scripts/daily-tasks-data-scope.test.mjs`
 */
import assert from 'node:assert/strict';
import test from 'node:test';

const PM_DAILY_TASKS_VIEW_KEY = 'project_management.daily_tasks.view';
const PM_DAILY_TASKS_VIEW_ALL_KEY = 'project_management.daily_tasks.view_all';

/** Mirror of `canViewOrganizationDailyTasks` in `src/lib/contracts/task-visibility.ts`. */
function canViewOrganizationDailyTasks(has) {
  return has(PM_DAILY_TASKS_VIEW_ALL_KEY);
}

/** Mirror of `canViewOwnDailyTasks` in `src/lib/contracts/task-visibility.ts`. */
function canViewOwnDailyTasks(has) {
  return has('tasks.read') || has(PM_DAILY_TASKS_VIEW_KEY);
}

/** Mirror of `resolveDailyTasksDataScope` in `daily-tasks-organization-scope.ts`. */
function resolveDailyTasksDataScope(input) {
  if (input.explicitScope) return input.explicitScope;

  const personalWorkspaceRequested = input.workspaceParam === 'my';
  const canUsePersonalApi = Boolean(input.canViewOwnTasks);

  if (personalWorkspaceRequested && canUsePersonalApi) {
    return 'own';
  }

  if (input.canViewOrganizationTasks) {
    return 'team';
  }

  return 'own';
}

function scopeFor(keys, portal, workspaceParam = null) {
  const permissions = new Set(keys);
  const has = (key) => permissions.has(key);
  const canOrg = canViewOrganizationDailyTasks(has);
  return {
    canOrg,
    canOwn: canViewOwnDailyTasks(has),
    scope: resolveDailyTasksDataScope({
      portal,
      workspaceParam,
      canViewOrganizationTasks: canOrg,
      canViewOwnTasks: canViewOwnDailyTasks(has),
    }),
  };
}

test('Employee role with only Daily Tasks → View Page stays on own scope', () => {
  const result = scopeFor([PM_DAILY_TASKS_VIEW_KEY], 'employee');
  assert.equal(result.canOrg, false);
  assert.equal(result.canOwn, true);
  assert.equal(result.scope, 'own');
});

test('View Page alone on the admin portal also stays on own scope', () => {
  assert.equal(scopeFor([PM_DAILY_TASKS_VIEW_KEY], 'admin').scope, 'own');
});

test('View All Tasks uses team scope (org API)', () => {
  const result = scopeFor([PM_DAILY_TASKS_VIEW_KEY, PM_DAILY_TASKS_VIEW_ALL_KEY], 'admin');
  assert.equal(result.canOrg, true);
  assert.equal(result.scope, 'team');
});

test('employee with only tasks.read stays on own scope', () => {
  const result = scopeFor(['tasks.read', 'attendance.punch.view'], 'employee');
  assert.equal(result.canOrg, false);
  assert.equal(result.scope, 'own');
});

test('tasks.read + employees.view no longer unlocks org scope', () => {
  const result = scopeFor(['tasks.read', 'employees.view'], 'admin');
  assert.equal(result.canOrg, false);
  assert.equal(result.scope, 'own');
});

test('Edit / Assign without View All Tasks stays on own scope (reported leak)', () => {
  const result = scopeFor(
    [PM_DAILY_TASKS_VIEW_KEY, 'project_management.daily_tasks.edit', 'project_management.daily_tasks.assign'],
    'employee',
  );
  assert.equal(result.canOrg, false);
  assert.equal(result.scope, 'own');
});

test('?workspace=my selects personal API even for org viewers', () => {
  const result = scopeFor([PM_DAILY_TASKS_VIEW_ALL_KEY, PM_DAILY_TASKS_VIEW_KEY], 'admin', 'my');
  assert.equal(result.scope, 'own');
});

test('Employee role (projects.read + tasks.read) stays on own scope', () => {
  const result = scopeFor(
    ['projects.read', 'tasks.read', 'daily_tasks.update_status', 'attendance.punch.view'],
    'employee',
  );
  assert.equal(result.canOrg, false);
  assert.equal(result.scope, 'own');
});

test('projects.read without tasks.read does not unlock org scope', () => {
  assert.equal(scopeFor(['projects.read', 'attendance.punch.view'], 'admin').canOrg, false);
});
