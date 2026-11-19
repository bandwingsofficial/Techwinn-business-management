/**
 * Employee portal permission paths + org vs self-service daily tasks routing.
 * Run: `node --test scripts/employee-portal-route-access.test.mjs`
 */
import assert from 'node:assert/strict';
import test from 'node:test';

const EMPLOYEE_SELF_SERVICE_EXACT = new Set([
  '/employee/dashboard',
  '/employee/leave',
  '/employee/daily-tasks',
  '/employee/task-calendar',
]);
const EMPLOYEE_SELF_SERVICE_PREFIXES = ['/employee/attendance', '/employee/calendar'];

function isEmployeeSelfServicePath(normalized) {
  if (EMPLOYEE_SELF_SERVICE_EXACT.has(normalized)) return true;
  return EMPLOYEE_SELF_SERVICE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function canonicalPermissionPath(pathname) {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 2) return normalized;
  const head = parts[0];
  if (head === 'admin' || head === 'project-manager') return normalized;
  if (head === 'employee') {
    if (isEmployeeSelfServicePath(normalized)) return normalized;
    return `/admin/${parts.slice(1).join('/')}`;
  }
  if (head === 'super-admin' || head === 'owner') {
    return `/admin/${parts.slice(1).join('/')}`;
  }
  return `/admin/${parts.slice(1).join('/')}`;
}

/** Mirror of `canViewOrganizationDailyTasks` in `src/lib/contracts/task-visibility.ts`. */
function canViewOrganizationDailyTasks(permissions) {
  return permissions.has('project_management.daily_tasks.view_all');
}

function canAccessLeaveManagementPage(permissions) {
  if (!permissions.has('leave.management.view')) return false;
  return (
    permissions.has('leave.management.tab.pending') ||
    permissions.has('leave.management.tab.all') ||
    permissions.has('leave.management.tab.approved') ||
    permissions.has('leave.management.tab.rejected')
  );
}

function pickDailyTasksWorkspace(permissions) {
  return canViewOrganizationDailyTasks(permissions) ? 'organization' : 'self-service';
}

test('employee org modules canonicalize to /admin permission registry', () => {
  assert.equal(canonicalPermissionPath('/employee/project-tasks'), '/admin/project-tasks');
  assert.equal(canonicalPermissionPath('/employee/leave-management'), '/admin/leave-management');
  assert.equal(canonicalPermissionPath('/employee/daily-tasks/history'), '/admin/daily-tasks/history');
});

test('employee self-service paths stay on /employee', () => {
  assert.equal(canonicalPermissionPath('/employee/daily-tasks'), '/employee/daily-tasks');
  assert.equal(canonicalPermissionPath('/employee/leave'), '/employee/leave');
});

test('Daily Tasks → View Page alone uses self-service daily tasks', () => {
  const perms = new Set(['project_management.daily_tasks.view']);
  assert.equal(pickDailyTasksWorkspace(perms), 'self-service');
});

test('org daily tasks workspace only with View All Tasks', () => {
  const perms = new Set([
    'project_management.daily_tasks.view',
    'project_management.daily_tasks.view_all',
  ]);
  assert.equal(pickDailyTasksWorkspace(perms), 'organization');
});

test('tasks.read + employees.view uses self-service daily tasks', () => {
  assert.equal(pickDailyTasksWorkspace(new Set(['tasks.read', 'employees.view'])), 'self-service');
});

test('View Page + Edit/Assign without View All Tasks uses self-service (reported leak)', () => {
  const perms = new Set([
    'project_management.daily_tasks.view',
    'project_management.daily_tasks.edit',
    'project_management.daily_tasks.assign',
  ]);
  assert.equal(pickDailyTasksWorkspace(perms), 'self-service');
});

test('self-service daily tasks when only tasks.read without org signals', () => {
  const perms = new Set(['tasks.read', 'leave.requests.read_own']);
  assert.equal(pickDailyTasksWorkspace(perms), 'self-service');
});

test('Employee role with projects.read + tasks.read uses self-service daily tasks', () => {
  const perms = new Set(['projects.read', 'tasks.read', 'daily_tasks.update_status']);
  assert.equal(pickDailyTasksWorkspace(perms), 'self-service');
});

function canAccessAppPathEmployeeOrg(path, permissions) {
  const canonical = canonicalPermissionPath(path);
  if (canonical === '/admin/leave-management' || canonical === '/admin/leave') {
    return canAccessLeaveManagementPage(permissions);
  }
  if (canonical === '/admin/project-tasks') {
    return permissions.has('projects.read');
  }
  return false;
}

test('leave management route needs view + tab permission', () => {
  assert.equal(canAccessLeaveManagementPage(new Set(['leave.management.view'])), false);
  assert.equal(
    canAccessLeaveManagementPage(
      new Set(['leave.management.view', 'leave.management.tab.pending']),
    ),
    true,
  );
  assert.equal(
    canAccessAppPathEmployeeOrg(
      '/employee/leave-management',
      new Set(['leave.management.view', 'leave.management.tab.all']),
    ),
    true,
  );
});

test('project management employee URL requires projects.read', () => {
  assert.equal(canAccessAppPathEmployeeOrg('/employee/project-tasks', new Set(['projects.read'])), true);
  assert.equal(canAccessAppPathEmployeeOrg('/employee/project-tasks', new Set(['tasks.read'])), false);
});