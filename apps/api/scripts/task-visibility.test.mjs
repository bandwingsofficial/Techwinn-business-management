/**
 * Employee task visibility — every task surface must scope employees to their own assignments.
 * Run after `pnpm run build`: `node --test scripts/task-visibility.test.mjs`
 *
 * Uses the compiled services/repositories with an in-memory Prisma fake that evaluates the
 * same `where` clauses the real queries send to the database.
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';

import {
  EMPLOYEE_PORTAL_PERMISSIONS,
  canViewOrganizationDailyTasks,
  canViewOrganizationProjectTasks,
  canViewOwnDailyTasks,
} from '../dist/lib/contracts/index.js';
import { DailyTaskValidationError } from '../dist/modules/project-management/modules/daily-tasks/domain/errors/daily-task.errors.js';
import { uniquePermissionKeys } from '../dist/modules/org-access/infrastructure/persistence/prisma/repositories/org-access-persistence.shared.js';
import { DailyTaskAuthorizationService } from '../dist/modules/project-management/modules/daily-tasks/application/services/daily-task-authorization.service.js';
import { DailyTaskForbiddenError } from '../dist/modules/project-management/modules/daily-tasks/domain/errors/daily-task.errors.js';
import { DailyTaskPrismaStore } from '../dist/modules/project-management/modules/daily-tasks/infrastructure/persistence/prisma/stores/daily-task-prisma.store.js';
import { ListCalendarTasksHandler } from '../dist/modules/project-management/modules/task-calendar/application/list-calendar-tasks/list-calendar-tasks.handler.js';
import { PrismaProjectTaskRepository } from '../dist/modules/project-management/modules/projects/infrastructure/persistence/prisma/repositories/prisma-project-task.repository.js';
import { GetProjectTaskBoardHandler } from '../dist/modules/project-management/modules/projects/application/get-project-task-board/get-project-task-board.handler.js';
import { DashboardAuthorizationService } from '../dist/modules/dashboard/application/services/dashboard-authorization.service.js';
import { DashboardDataService } from '../dist/modules/dashboard/application/services/dashboard-data.service.js';

const ORG = 'org-1';

// ── Minimal Prisma `where` evaluator ────────────────────────────────────────

function matches(row, where) {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;
    if (key === 'AND') {
      if (!cond.every((w) => matches(row, w))) return false;
      continue;
    }
    if (key === 'OR') {
      if (!cond.some((w) => matches(row, w))) return false;
      continue;
    }
    const value = row[key];
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('some' in cond) {
        if (!(value ?? []).some((child) => matches(child, cond.some))) return false;
      } else if ('in' in cond) {
        if (!cond.in.includes(value)) return false;
      } else if ('not' in cond) {
        if (cond.not === null ? value == null : value === cond.not) return false;
      } else if ('is' in cond) {
        if (!value || !matches(value, cond.is)) return false;
      } else {
        throw new Error(`Unsupported where operator on "${key}": ${JSON.stringify(cond)}`);
      }
      continue;
    }
    if (value !== cond) return false;
  }
  return true;
}

// ── Fixtures: Akshay / Rahul / John (employees) + manager + super admin ────

const ADMINS = {
  akshay: 'admin-akshay',
  /** Second sign-in account with the same display name and no employee link. */
  akshayNamesake: 'admin-akshay-namesake',
  rahul: 'admin-rahul',
  john: 'admin-john',
  manager: 'admin-manager',
  /** Custom "Employee" role that only holds Daily Tasks → View Page (as found in the audited DB). */
  viewPageOnly: 'admin-view-page-only',
  superAdmin: 'admin-super',
};

const LIVE = { employmentStatus: 'ACTIVE', deactivatedAt: null, deletedAt: null };

const EMPLOYEES = [
  { id: 'emp-akshay', organizationId: ORG, platformAdminId: ADMINS.akshay, displayName: 'Akshay', employeeCode: 'E001', ...LIVE },
  { id: 'emp-rahul', organizationId: ORG, platformAdminId: ADMINS.rahul, displayName: 'Rahul', employeeCode: 'E002', ...LIVE },
  { id: 'emp-john', organizationId: ORG, platformAdminId: ADMINS.john, displayName: 'John', employeeCode: 'E003', ...LIVE },
  { id: 'emp-manager', organizationId: ORG, platformAdminId: ADMINS.manager, displayName: 'Manager', employeeCode: 'M001', ...LIVE },
  { id: 'emp-view-page', organizationId: ORG, platformAdminId: ADMINS.viewPageOnly, displayName: 'Akshay', employeeCode: 'E004', ...LIVE },
];

/** Employee role exactly as resolved at runtime (stored keys → legacy expansion → prerequisites). */
const EMPLOYEE_EFFECTIVE = uniquePermissionKeys([
  ...EMPLOYEE_PORTAL_PERMISSIONS,
  'project_management.task_calendar.view',
  // Granted to the Employee role by the dashboard permissions migration.
  'dashboard.view',
  'dashboard.tasks.summary',
  'dashboard.tasks.assigned',
  'dashboard.projects.summary',
  'dashboard.projects.all',
  'dashboard.projects.progress',
]);

const MANAGER_EFFECTIVE = uniquePermissionKeys([
  'tasks.read',
  'tasks.create',
  'tasks.assign',
  'tasks.update',
  'projects.read',
  'project_management.daily_tasks.view',
  'project_management.daily_tasks.view_details',
  'project_management.task_calendar.view',
  'dashboard.view',
  'dashboard.tasks.summary',
  'dashboard.tasks.all',
  'dashboard.projects.summary',
  'dashboard.projects.all',
  'dashboard.projects.progress',
]);

const VIEW_PAGE_ONLY_EFFECTIVE = uniquePermissionKeys(['project_management.daily_tasks.view']);

const PERMISSIONS_BY_ADMIN = {
  [ADMINS.akshay]: EMPLOYEE_EFFECTIVE,
  [ADMINS.akshayNamesake]: EMPLOYEE_EFFECTIVE,
  [ADMINS.rahul]: EMPLOYEE_EFFECTIVE,
  [ADMINS.john]: EMPLOYEE_EFFECTIVE,
  [ADMINS.manager]: MANAGER_EFFECTIVE,
  [ADMINS.viewPageOnly]: VIEW_PAGE_ONLY_EFFECTIVE,
  [ADMINS.superAdmin]: [],
};

function actor(adminId) {
  return { organizationId: ORG, adminId, isPlatformSuperAdmin: adminId === ADMINS.superAdmin };
}

const permissionChecker = {
  async resolveEffectivePermissions(a) {
    return PERMISSIONS_BY_ADMIN[a.adminId] ?? [];
  },
};

function makeAssignee(dailyTaskId, employeeId, extra = {}) {
  return {
    id: `asg-${dailyTaskId}-${employeeId ?? 'former'}`,
    organizationId: ORG,
    dailyTaskId,
    employeeId,
    historicalDisplayName: '',
    historicalEmployeeCode: '',
    startedAt: null,
    completedAt: null,
    ...extra,
  };
}

function createDb() {
  const db = {
    employees: EMPLOYEES.map((e) => ({ ...e })),
    dailyTasks: [
      { id: 'task-a', organizationId: ORG, title: 'Task A', assignDate: new Date('2026-11-19T00:00:00Z'), dueDate: null, priority: 'MEDIUM' },
      { id: 'task-b', organizationId: ORG, title: 'Task B', assignDate: new Date('2026-11-19T00:00:00Z'), dueDate: null, priority: 'MEDIUM' },
      { id: 'task-c', organizationId: ORG, title: 'Task C', assignDate: new Date('2026-11-19T00:00:00Z'), dueDate: null, priority: 'MEDIUM' },
      { id: 'task-shared', organizationId: ORG, title: 'Shared', assignDate: new Date('2026-11-19T00:00:00Z'), dueDate: null, priority: 'MEDIUM' },
    ],
    assignees: [
      makeAssignee('task-a', 'emp-akshay'),
      makeAssignee('task-b', 'emp-rahul'),
      makeAssignee('task-c', 'emp-john'),
      makeAssignee('task-shared', 'emp-akshay'),
      makeAssignee('task-shared', 'emp-rahul'),
    ],
    activities: [],
  };

  const withAssignees = (task) => ({
    ...task,
    assignees: db.assignees.filter((a) => a.dailyTaskId === task.id),
  });

  const prisma = {
    employee: {
      findMany: async ({ where }) => db.employees.filter((e) => matches(e, where)),
      findFirst: async ({ where }) => db.employees.find((e) => matches(e, where)) ?? null,
    },
    dailyTask: {
      findFirst: async ({ where }) => db.dailyTasks.find((t) => matches(t, where)) ?? null,
      update: async () => ({}),
      findFirstOrThrow: async () => {
        throw new Error('TEST_STOP_AFTER_TRANSACTION');
      },
      count: async ({ where }) => db.dailyTasks.map(withAssignees).filter((t) => matches(t, where)).length,
    },
    dailyTaskAssignee: {
      count: async ({ where }) => db.assignees.filter((a) => matches(a, where)).length,
      findMany: async ({ where }) =>
        db.assignees
          .filter((a) => matches(a, where))
          .map((a) => ({ ...a, employee: db.employees.find((e) => e.id === a.employeeId) ?? null })),
      deleteMany: async ({ where }) => {
        const before = db.assignees.length;
        db.assignees = db.assignees.filter((a) => !matches(a, where));
        return { count: before - db.assignees.length };
      },
      createMany: async ({ data }) => {
        for (const row of data) db.assignees.push(makeAssignee(row.dailyTaskId, row.employeeId, { id: row.id }));
        return { count: data.length };
      },
    },
    dailyTaskActivity: {
      create: async ({ data }) => {
        db.activities.push(data);
        return data;
      },
    },
    platformAdmin: {
      findUnique: async () => ({ displayName: 'Manager', email: 'manager@example.com', archivedEmail: null }),
    },
    $transaction: async (fn) => fn(prisma),
  };

  return { db, prisma, withAssignees };
}

function createDailyServices() {
  const { db, prisma, withAssignees } = createDb();
  const store = new DailyTaskPrismaStore(prisma, {
    assertEmployeesAssignableOnDate: async () => {},
  });
  const authz = new DailyTaskAuthorizationService(permissionChecker, store);

  /** Mirrors `GET /daily-tasks/my`: the trusted admin id → employee ids → assignee filter. */
  async function visibleDailyTaskIds(adminId) {
    const employeeIds = await store.findEmployeeIdsForAdmin(ORG, adminId);
    if (employeeIds.length === 0) return [];
    const where = store.buildWhere(ORG, { employeeIdsForMyTasks: employeeIds });
    return db.dailyTasks.map(withAssignees).filter((t) => matches(t, where)).map((t) => t.id);
  }

  async function canRead(adminId, taskId) {
    try {
      await authz.assertCanReadTask(actor(adminId), taskId);
      return true;
    } catch (error) {
      if (error instanceof DailyTaskForbiddenError) return false;
      throw error;
    }
  }

  async function reassign(taskId, employeeIds) {
    await assert.rejects(
      store.updateTask(ORG, ADMINS.manager, taskId, { employeeIds }),
      /TEST_STOP_AFTER_TRANSACTION/,
    );
  }

  return { db, prisma, store, authz, visibleDailyTaskIds, canRead, reassign };
}

// ── Permission rules ────────────────────────────────────────────────────────

test('Daily Tasks → View Page alone only reveals own tasks (custom Employee role)', () => {
  const effective = new Set(VIEW_PAGE_ONLY_EFFECTIVE);
  assert.equal(effective.has('tasks.read'), false);
  assert.equal(canViewOrganizationDailyTasks(effective), false);
  assert.equal(canViewOwnDailyTasks(effective), true);
});

test('tasks.read + collaborator keys no longer imply organization daily tasks', () => {
  const collaborator = new Set(['tasks.read', 'employees.view']);
  assert.equal(canViewOrganizationDailyTasks(collaborator), false);
  assert.equal(canViewOwnDailyTasks(collaborator), true);
});

test('Employee role runtime permissions do not grant organization task visibility', () => {
  const effective = new Set(EMPLOYEE_EFFECTIVE);
  assert.ok(effective.has('projects.read') && effective.has('tasks.read'));
  assert.equal(
    effective.has('project_management.daily_tasks.view'),
    false,
    'status-update / project keys must not imply the organization Daily Tasks board',
  );
  assert.equal(canViewOrganizationDailyTasks(effective), false);
  assert.equal(canViewOrganizationProjectTasks(effective), false);
  assert.equal(canViewOwnDailyTasks(effective), true);
});

test('Managers and platform Super Admin keep organization-wide visibility', () => {
  const manager = new Set(MANAGER_EFFECTIVE);
  assert.equal(canViewOrganizationDailyTasks(manager), true);
  assert.equal(canViewOrganizationProjectTasks(manager), true);
  assert.equal(canViewOrganizationDailyTasks(new Set(), true), true);
  assert.equal(canViewOrganizationProjectTasks(new Set(), true), true);
});

test('organization board needs the explicit View All Tasks key', () => {
  assert.equal(
    canViewOrganizationDailyTasks(new Set(['tasks.read', 'project_management.daily_tasks.view'])),
    false,
  );
  const viewAll = new Set(uniquePermissionKeys(['project_management.daily_tasks.view_all']));
  assert.ok(viewAll.has('project_management.daily_tasks.view'), 'View All implies the page');
  assert.equal(canViewOrganizationDailyTasks(viewAll), true);
});

// ── Identity: trusted session → Employee.platformAdminId only ──────────────

test('identity: View Page-only employee sees only own tasks and cannot open the org board', async () => {
  const { db, authz, visibleDailyTaskIds, canRead } = createDailyServices();
  db.assignees.push(makeAssignee('task-c', 'emp-view-page'));
  assert.deepEqual(await visibleDailyTaskIds(ADMINS.viewPageOnly), ['task-c']);
  assert.equal(await canRead(ADMINS.viewPageOnly, 'task-c'), true);
  assert.equal(await canRead(ADMINS.viewPageOnly, 'task-a'), false);
  await assert.rejects(
    authz.assertOrganizationTaskAccess(actor(ADMINS.viewPageOnly)),
    DailyTaskForbiddenError,
  );
});

test('identity: an account sharing a display name is never matched to that employee', async () => {
  const { store, visibleDailyTaskIds, canRead } = createDailyServices();
  assert.deepEqual(await store.findEmployeeIdsForAdmin(ORG, ADMINS.akshayNamesake), []);
  assert.deepEqual(await visibleDailyTaskIds(ADMINS.akshayNamesake), []);
  assert.equal(await canRead(ADMINS.akshayNamesake, 'task-a'), false);
  // Two employees named "Akshay" stay separate identities.
  assert.deepEqual(await store.findEmployeeIdsForAdmin(ORG, ADMINS.akshay), ['emp-akshay']);
  assert.deepEqual(await store.findEmployeeIdsForAdmin(ORG, ADMINS.viewPageOnly), ['emp-view-page']);
});

test('identity: soft-deleted or deactivated employees never resolve for the session', async () => {
  for (const patch of [{ deletedAt: new Date() }, { deactivatedAt: new Date() }, { employmentStatus: 'TERMINATED' }]) {
    const { db, store, visibleDailyTaskIds, canRead } = createDailyServices();
    Object.assign(db.employees.find((e) => e.id === 'emp-akshay'), patch);
    assert.deepEqual(await store.findEmployeeIdsForAdmin(ORG, ADMINS.akshay), [], JSON.stringify(patch));
    assert.deepEqual(await visibleDailyTaskIds(ADMINS.akshay), []);
    assert.equal(await canRead(ADMINS.akshay, 'task-a'), false);
  }
});

test('identity: an employee link in another organization grants nothing here', async () => {
  const { db, store } = createDailyServices();
  db.employees.find((e) => e.id === 'emp-akshay').organizationId = 'org-2';
  assert.deepEqual(await store.findEmployeeIdsForAdmin(ORG, ADMINS.akshay), []);
});

test('identity: soft-deleted, deactivated or foreign employees cannot be assigned', async () => {
  const { db, store } = createDailyServices();
  await store.assertEmployeesEligible(ORG, ['emp-akshay', 'emp-rahul']);
  db.employees.find((e) => e.id === 'emp-rahul').deletedAt = new Date();
  await assert.rejects(store.assertEmployeesEligible(ORG, ['emp-akshay', 'emp-rahul']), DailyTaskValidationError);
  db.employees.find((e) => e.id === 'emp-john').deactivatedAt = new Date();
  await assert.rejects(store.assertEmployeesEligible(ORG, ['emp-john']), DailyTaskValidationError);
  await assert.rejects(store.assertEmployeesEligible(ORG, ['emp-unknown']), DailyTaskValidationError);
});

test('org viewers without View Card Details can still open tasks assigned to them', async () => {
  const viewAllOnly = uniquePermissionKeys(['project_management.daily_tasks.view_all']);
  const { authz } = createDailyServices();
  const original = PERMISSIONS_BY_ADMIN[ADMINS.rahul];
  PERMISSIONS_BY_ADMIN[ADMINS.rahul] = viewAllOnly;
  try {
    await authz.assertOrganizationTaskAccess(actor(ADMINS.rahul));
    await authz.assertCanReadTask(actor(ADMINS.rahul), 'task-b');
    await assert.rejects(authz.assertCanReadTask(actor(ADMINS.rahul), 'task-c'), /View Card Details/);
  } finally {
    PERMISSIONS_BY_ADMIN[ADMINS.rahul] = original;
  }
});

// ── Scenario 1: single assignment ───────────────────────────────────────────

test('scenario 1: Akshay, Rahul and John each see only their own task', async () => {
  const { visibleDailyTaskIds } = createDailyServices();
  assert.deepEqual(await visibleDailyTaskIds(ADMINS.akshay), ['task-a', 'task-shared']);
  assert.deepEqual(await visibleDailyTaskIds(ADMINS.rahul), ['task-b', 'task-shared']);
  assert.deepEqual(await visibleDailyTaskIds(ADMINS.john), ['task-c']);
});

test('scenario 1: employees cannot open the organization list or board', async () => {
  const { authz } = createDailyServices();
  for (const adminId of [ADMINS.akshay, ADMINS.rahul, ADMINS.john]) {
    await assert.rejects(authz.assertOrganizationTaskAccess(actor(adminId)), DailyTaskForbiddenError);
  }
});

// ── Scenarios 2 & 9: multiple assignees ─────────────────────────────────────

test('scenarios 2/9: multi-assigned task is visible to each assignee, not to others', async () => {
  const { canRead } = createDailyServices();
  assert.equal(await canRead(ADMINS.akshay, 'task-shared'), true);
  assert.equal(await canRead(ADMINS.rahul, 'task-shared'), true);
  assert.equal(await canRead(ADMINS.john, 'task-shared'), false);
});

// ── Scenario 3: reassignment ────────────────────────────────────────────────

test('scenario 3: reassignment moves access from the old to the new assignee', async () => {
  const { reassign, canRead, visibleDailyTaskIds } = createDailyServices();
  assert.equal(await canRead(ADMINS.akshay, 'task-a'), true);
  assert.equal(await canRead(ADMINS.rahul, 'task-a'), false);

  await reassign('task-a', ['emp-rahul']);

  assert.equal(await canRead(ADMINS.akshay, 'task-a'), false);
  assert.equal(await canRead(ADMINS.rahul, 'task-a'), true);
  assert.equal((await visibleDailyTaskIds(ADMINS.akshay)).includes('task-a'), false);
  assert.equal((await visibleDailyTaskIds(ADMINS.rahul)).includes('task-a'), true);
});

// ── Scenario 10: history preserved ──────────────────────────────────────────

test('scenario 10: reassignment keeps former-employee rows, retained progress and an audit snapshot', async () => {
  const { db, reassign, canRead } = createDailyServices();
  const startedAt = new Date('2026-11-18T09:00:00Z');
  db.assignees = db.assignees.filter((a) => a.dailyTaskId !== 'task-shared');
  db.assignees.push(
    makeAssignee('task-shared', 'emp-akshay', { startedAt }),
    makeAssignee('task-shared', 'emp-rahul', { startedAt, completedAt: startedAt }),
    makeAssignee('task-shared', null, { historicalDisplayName: 'Former Dev', historicalEmployeeCode: 'E000' }),
  );
  const rahulRowId = db.assignees.find((a) => a.dailyTaskId === 'task-shared' && a.employeeId === 'emp-rahul').id;

  await reassign('task-shared', ['emp-rahul', 'emp-john']);

  const rows = db.assignees.filter((a) => a.dailyTaskId === 'task-shared');
  const former = rows.find((a) => a.employeeId === null);
  assert.ok(former, 'former-employee assignment row must not be deleted');
  assert.equal(former.historicalDisplayName, 'Former Dev');

  const rahul = rows.find((a) => a.employeeId === 'emp-rahul');
  assert.equal(rahul.id, rahulRowId, 'retained assignee row is kept, not recreated');
  assert.equal(rahul.completedAt, startedAt);

  assert.ok(rows.some((a) => a.employeeId === 'emp-john'));
  assert.equal(rows.some((a) => a.employeeId === 'emp-akshay'), false);

  const change = db.activities.find((a) => a.eventType === 'ASSIGNEES_CHANGED');
  assert.ok(change, 'assignment history activity is recorded');
  assert.deepEqual(change.metadata.toEmployeeIds, ['emp-rahul', 'emp-john']);
  assert.equal(change.metadata.removedAssignees.length, 1);
  assert.equal(change.metadata.removedAssignees[0].employeeId, 'emp-akshay');
  assert.equal(change.metadata.removedAssignees[0].displayName, 'Akshay');
  assert.equal(change.metadata.removedAssignees[0].startedAt, startedAt.toISOString());

  assert.equal(await canRead(ADMINS.akshay, 'task-shared'), false);
  assert.equal(await canRead(ADMINS.john, 'task-shared'), true);
});

test('null employeeId history rows never grant access to anyone', async () => {
  const { db, canRead } = createDailyServices();
  db.assignees.push(makeAssignee('task-c', null, { historicalDisplayName: 'Former Dev' }));
  assert.equal(await canRead(ADMINS.akshay, 'task-c'), false);
  assert.equal(await canRead(ADMINS.rahul, 'task-c'), false);
});

// ── Scenario 7: direct API access attempts ──────────────────────────────────

test('scenario 7: changing the task id in the URL is rejected for every task action', async () => {
  const { authz } = createDailyServices();
  const akshay = actor(ADMINS.akshay);
  await assert.rejects(authz.assertCanReadTask(akshay, 'task-b'), DailyTaskForbiddenError);
  await assert.rejects(authz.assertCanUpdateTaskProgress(akshay, 'task-b'), DailyTaskForbiddenError);
  await assert.rejects(authz.assertCanAddComment(akshay, 'task-b', 'employee'), DailyTaskForbiddenError);
  await assert.rejects(authz.assertCanCreateTaskNote(akshay, 'task-b'), DailyTaskForbiddenError);
  await assert.rejects(authz.assertCanListTaskNotes(akshay, 'task-b'), DailyTaskForbiddenError);
  await assert.rejects(authz.assertCanReadTask(akshay, 'task-does-not-exist'), DailyTaskForbiddenError);
});

// ── Scenario 8: admin organization-wide access ──────────────────────────────

test('scenario 8: manager and platform Super Admin keep organization access', async () => {
  const { authz } = createDailyServices();
  for (const adminId of [ADMINS.manager, ADMINS.superAdmin]) {
    await authz.assertOrganizationTaskAccess(actor(adminId));
    await authz.assertCanReadTask(actor(adminId), 'task-b');
  }
});

// ── Scenario 4: project with five tasks ─────────────────────────────────────

function createProjectFixture() {
  const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
  const assigneeFor = (adminId) =>
    adminId ? { id: adminId, displayName: adminId, email: `${adminId}@example.com` } : null;
  const task = (n, adminId) => ({
    id: `ptask-${n}`,
    organizationId: ORG,
    projectId: 'project-1',
    phaseId: 'phase-1',
    title: `Project task ${n}`,
    description: '',
    status: n === 1 ? 'COMPLETED' : 'TODO',
    priority: 'MEDIUM',
    assigneeAdminId: adminId,
    assignee: assigneeFor(adminId),
    startDate: day('2026-11-01'),
    dueDate: day('2026-11-30'),
    actualStartedAt: null,
    actualCompletedAt: null,
    labels: [],
    sortOrder: n,
    inPlanBaseline: true,
    createdAt: day('2026-10-01'),
    updatedAt: day('2026-10-01'),
  });
  const project = {
    id: 'project-1',
    organizationId: ORG,
    projectNumber: 'P-001',
    name: 'Website',
    description: 'Site rebuild',
    scopeAndRequirements: '',
    clientId: 'client-1',
    clientName: 'Client',
    clientPhone: '',
    companyName: 'Client Co',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    executionLifecycle: 'IN_PRODUCTION',
    actualProductionStartedAt: null,
    actualCompletedAt: null,
    startDate: day('2026-11-01'),
    expectedEndDate: day('2026-12-31'),
    updatedAt: day('2026-11-01'),
    phases: [
      {
        id: 'phase-1',
        name: 'Build',
        description: '',
        status: 'IN_PROGRESS',
        startDate: day('2026-11-01'),
        expectedEndDate: day('2026-12-31'),
        actualStartedAt: null,
        actualCompletedAt: null,
        sortOrder: 0,
      },
    ],
    tasks: [
      task(1, ADMINS.akshay),
      task(2, ADMINS.rahul),
      task(3, ADMINS.john),
      task(4, ADMINS.rahul),
      task(5, null),
    ],
  };
  const otherProject = {
    ...project,
    id: 'project-2',
    projectNumber: 'P-002',
    name: 'Internal',
    tasks: [{ ...task(6, ADMINS.john), projectId: 'project-2' }],
  };
  const projects = [project, otherProject];

  const projectView = (row, include) => ({
    ...row,
    phases: row.phases,
    tasks: row.tasks.filter((t) => matches(t, include?.tasks?.where)),
  });

  const prisma = {
    project: {
      findFirst: async ({ where, include }) => {
        const row = projects.find((p) => matches(p, where));
        return row ? projectView(row, include) : null;
      },
      findMany: async ({ where, include }) =>
        projects.filter((p) => matches(p, where)).map((p) => projectView(p, include)),
      count: async ({ where }) => projects.filter((p) => matches(p, where)).length,
    },
  };
  return new PrismaProjectTaskRepository(prisma);
}

function boardTaskTitles(board) {
  return board.phases.flatMap((phase) => phase.tasks.map((t) => t.title));
}

test('scenario 4: project board shows employees only their assigned project tasks', async () => {
  const repository = createProjectFixture();
  const handler = new GetProjectTaskBoardHandler(repository);
  const board = (adminId) =>
    handler.execute({
      actor: { organizationId: ORG, adminId },
      projectId: 'project-1',
      organizationWide: canViewOrganizationProjectTasks(new Set(PERMISSIONS_BY_ADMIN[adminId])),
    });

  assert.deepEqual(boardTaskTitles(await board(ADMINS.akshay)), ['Project task 1']);
  assert.deepEqual(boardTaskTitles(await board(ADMINS.rahul)), ['Project task 2', 'Project task 4']);
  assert.deepEqual(boardTaskTitles(await board(ADMINS.john)), ['Project task 3']);
  assert.equal(boardTaskTitles(await board(ADMINS.manager)).length, 5);

  const akshayBoard = await board(ADMINS.akshay);
  assert.equal(akshayBoard.project.taskCount, 1, 'project stats only count own tasks');
  assert.equal(akshayBoard.project.completedTaskCount, 1);
});

test('scenario 4: project task summaries list only projects/tasks assigned to the employee', async () => {
  const repository = createProjectFixture();
  const list = (assigneeAdminId) =>
    repository.listProjectSummaries(ORG, { page: 1, pageSize: 20, assigneeAdminId });

  const akshay = await list(ADMINS.akshay);
  assert.deepEqual(akshay.items.map((p) => p.id), ['project-1']);
  assert.equal(akshay.items[0].taskCount, 1);
  assert.equal(akshay.tabCounts.all, 1);

  const john = await list(ADMINS.john);
  assert.deepEqual(john.items.map((p) => p.id).sort(), ['project-1', 'project-2']);
  assert.equal(john.items.find((p) => p.id === 'project-1').taskCount, 1);

  const org = await list(undefined);
  assert.equal(org.items.find((p) => p.id === 'project-1').taskCount, 5);
});

// ── Scenario 5: calendar reuses the same visibility rules ───────────────────

function createCalendarHandler(adminId) {
  const { prisma, authz } = createDailyServices();
  const calls = { org: [], my: [], project: [] };
  const data = {
    listDailyTasksInRange: async (...args) => {
      calls.org.push(args);
      return [];
    },
    listProjectTasksForCalendar: async (organizationId, filters) => {
      calls.project.push(filters);
      return [];
    },
  };
  const dailyTasks = {
    listMyTasks: async (organizationId, calledAdminId) => {
      calls.my.push(calledAdminId);
      return { items: [], total: 0, page: 1, pageSize: 500 };
    },
    listWorkflowStages: async () => [],
  };
  const handler = new ListCalendarTasksHandler(data, authz, dailyTasks, prisma);
  const run = (query = {}) =>
    handler.execute({
      organizationId: ORG,
      clientToday: '2026-11-19',
      accessActor: actor(adminId),
      query: { startDate: '2026-11-01', endDate: '2026-11-30', ...query },
    });
  return { run, calls };
}

test('scenario 5: employee calendar uses own daily + own project tasks only', async () => {
  const { run, calls } = createCalendarHandler(ADMINS.akshay);
  await run();
  assert.equal(calls.org.length, 0, 'organization daily list must not be queried');
  assert.deepEqual(calls.my, [ADMINS.akshay]);
  assert.equal(calls.project.length, 1);
  assert.equal(calls.project[0].employeeId, 'emp-akshay');
});

test('scenario 5/7: employee cannot request another employee calendar', async () => {
  const { run } = createCalendarHandler(ADMINS.akshay);
  await assert.rejects(run({ employeeId: 'emp-rahul' }), ForbiddenException);
});

test('scenario 8: manager calendar stays organization-wide', async () => {
  const { run, calls } = createCalendarHandler(ADMINS.manager);
  await run();
  assert.equal(calls.org.length, 1);
  assert.equal(calls.my.length, 0);
  assert.equal(calls.project[0].employeeId, undefined);
});

// ── Scenario 6: dashboard counts ────────────────────────────────────────────

test('scenario 6: employee dashboard task/project widgets are clamped to own assignments', async () => {
  const { authz } = createDailyServices();
  const dashboardAuthz = new DashboardAuthorizationService(permissionChecker, authz);
  const employee = new Set(EMPLOYEE_EFFECTIVE);
  const widened = new Set([...EMPLOYEE_EFFECTIVE, 'dashboard.tasks.all', 'dashboard.tasks.team']);

  assert.equal(dashboardAuthz.scopeForWidget(actor(ADMINS.akshay), 'tasks.kpi', employee), 'assigned');
  assert.equal(dashboardAuthz.scopeForWidget(actor(ADMINS.akshay), 'tasks.kpi', widened), 'assigned');
  assert.equal(dashboardAuthz.scopeForWidget(actor(ADMINS.akshay), 'projects.kpi', employee), 'assigned');

  const manager = new Set(MANAGER_EFFECTIVE);
  assert.equal(dashboardAuthz.scopeForWidget(actor(ADMINS.manager), 'tasks.kpi', manager), 'organization');
  assert.equal(dashboardAuthz.scopeForWidget(actor(ADMINS.manager), 'projects.kpi', manager), 'organization');
});

test('scenario 6: employee dashboard counts only include that employee\'s tasks', async () => {
  const { prisma } = createDailyServices();
  const data = new DashboardDataService(prisma);
  const count = (adminId, employeeId, scope) =>
    prisma.dailyTask.count({ where: data.taskScopeWhere(actor(adminId), scope, employeeId) });

  assert.equal(await count(ADMINS.akshay, 'emp-akshay', 'assigned'), 2);
  assert.equal(await count(ADMINS.rahul, 'emp-rahul', 'assigned'), 2);
  assert.equal(await count(ADMINS.john, 'emp-john', 'assigned'), 1);
  assert.equal(await count(ADMINS.manager, 'emp-manager', 'organization'), 4);
});
