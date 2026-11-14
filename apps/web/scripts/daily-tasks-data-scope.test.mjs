/**
 * Daily Tasks data scope must route org viewers to org APIs (not `/my`).
 * Run: `node --experimental-strip-types --test scripts/daily-tasks-data-scope.test.mjs`
 */
import assert from 'node:assert/strict';
import test from 'node:test';

const PM_DAILY_TASKS_VIEW_KEY = 'project_management.daily_tasks.view';

function canViewOrganizationDailyTasks(has, hasAny) {
  if (has(PM_DAILY_TASKS_VIEW_KEY)) return true;
  const manage = [
    'tasks.create',
    'tasks.assign',
    'tasks.update',
    'tasks.delete',
    'project_management.daily_tasks.assign',
    'project_management.daily_tasks.edit',
    'project_management.daily_tasks.delete',
  ];
  if (hasAny(...manage)) return true;
  if (!has('tasks.read')) return false;
  if (hasAny('employees.view', 'leads.read', 'clients.read')) return true;
  if (has('projects.read') && has('tasks.read')) return true;
  if (
    hasAny('attendance.view_own', 'leave.requests.read_own', 'leave.balances.read_own')
  ) {
    return false;
  }
  return false;
}

function resolveDailyTasksDataScope(input) {
  if (input.explicitScope) return input.explicitScope;

  const personalWorkspaceRequested = input.workspaceParam === 'my';
  const canUsePersonalApi = Boolean(input.hasTasksRead);

  if (personalWorkspaceRequested && canUsePersonalApi) {
    return 'own';
  }

  if (input.canViewOrganizationTasks) {
    return 'team';
  }

  if (input.portal === 'employee' || canUsePersonalApi) {
    return 'own';
  }

  return 'own';
}

test('employee portal + org daily tasks view uses team scope (org API)', () => {
  const permissions = new Set([PM_DAILY_TASKS_VIEW_KEY]);
  const has = (key) => permissions.has(key);
  const hasAny = (...keys) => keys.some((k) => permissions.has(k));
  const canOrg = canViewOrganizationDailyTasks(has, hasAny);
  assert.equal(canOrg, true);
  const scope = resolveDailyTasksDataScope({
    portal: 'employee',
    workspaceParam: null,
    canViewOrganizationTasks: canOrg,
    hasTasksRead: false,
  });
  assert.equal(scope, 'team');
});

test('project manager without tasks.read uses team scope', () => {
  const permissions = new Set([PM_DAILY_TASKS_VIEW_KEY]);
  const has = (key) => permissions.has(key);
  const hasAny = (...keys) => keys.some((k) => permissions.has(k));
  const canOrg = canViewOrganizationDailyTasks(has, hasAny);
  const scope = resolveDailyTasksDataScope({
    portal: 'admin',
    workspaceParam: null,
    canViewOrganizationTasks: canOrg,
    hasTasksRead: false,
  });
  assert.equal(scope, 'team');
});

test('employee with only tasks.read stays on own scope', () => {
  const permissions = new Set(['tasks.read', 'attendance.view_own']);
  const has = (key) => permissions.has(key);
  const hasAny = (...keys) => keys.some((k) => permissions.has(k));
  const canOrg = canViewOrganizationDailyTasks(has, hasAny);
  assert.equal(canOrg, false);
  const scope = resolveDailyTasksDataScope({
    portal: 'employee',
    workspaceParam: null,
    canViewOrganizationTasks: canOrg,
    hasTasksRead: true,
  });
  assert.equal(scope, 'own');
});

test('?workspace=my with tasks.read selects personal API', () => {
  const permissions = new Set([PM_DAILY_TASKS_VIEW_KEY, 'tasks.read']);
  const has = (key) => permissions.has(key);
  const hasAny = (...keys) => keys.some((k) => permissions.has(k));
  const canOrg = canViewOrganizationDailyTasks(has, hasAny);
  const scope = resolveDailyTasksDataScope({
    portal: 'admin',
    workspaceParam: 'my',
    canViewOrganizationTasks: canOrg,
    hasTasksRead: true,
  });
  assert.equal(scope, 'own');
});

test('projects.read without tasks.read does not unlock org scope', () => {
  const permissions = new Set(['projects.read', 'attendance.view_own']);
  const has = (key) => permissions.has(key);
  const hasAny = (...keys) => keys.some((k) => permissions.has(k));
  const canOrg = canViewOrganizationDailyTasks(has, hasAny);
  assert.equal(canOrg, false);
});