/**
 * Daily task realtime poll filters events by recipient admin id and org-manager visibility.
 * Run after `pnpm run build`: `node --test scripts/daily-task-realtime.test.mjs`
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';

import { EMPLOYEE_PORTAL_PERMISSIONS } from '../dist/lib/contracts/index.js';
import { uniquePermissionKeys } from '../dist/modules/org-access/infrastructure/persistence/prisma/repositories/org-access-persistence.shared.js';
import { DailyTaskRealtimePublisher } from '../dist/modules/project-management/modules/daily-tasks/application/services/daily-task-realtime.publisher.js';
import { DailyTaskRealtimeService } from '../dist/modules/project-management/modules/daily-tasks/application/services/daily-task-realtime.service.js';

const ORG = 'org-1';
const ADMINS = {
  sachin: 'admin-sachin',
  akshay: 'admin-akshay',
  viewPageOnly: 'admin-view-page-only',
  manager: 'admin-manager',
};

const EMPLOYEE_EFFECTIVE = uniquePermissionKeys([...EMPLOYEE_PORTAL_PERMISSIONS]);
const VIEW_PAGE_ONLY_EFFECTIVE = uniquePermissionKeys(['project_management.daily_tasks.view']);
const MANAGER_EFFECTIVE = uniquePermissionKeys([
  ...EMPLOYEE_EFFECTIVE,
  'project_management.daily_tasks.view_all',
]);

const events = [];
let nextId = 1n;

const EMPLOYEES = [
  { id: 'emp-sachin', organizationId: ORG, platformAdminId: ADMINS.sachin },
  { id: 'emp-akshay', organizationId: ORG, platformAdminId: ADMINS.akshay },
  { id: 'emp-other-org', organizationId: 'org-2', platformAdminId: 'admin-other-org' },
];

const prisma = {
  dailyTaskRealtimeEvent: {
    create: async ({ data }) => {
      const row = {
        id: nextId++,
        createdAt: new Date(),
        ...data,
      };
      events.push(row);
      return row;
    },
    findFirst: async ({ where, orderBy }) => {
      const filtered = events.filter((e) => e.organizationId === where.organizationId);
      if (orderBy?.id === 'desc') {
        return filtered.sort((a, b) => (a.id < b.id ? 1 : -1))[0] ?? null;
      }
      return filtered[0] ?? null;
    },
    findMany: async ({ where, take }) => {
      const rows = events.filter(
        (e) => e.organizationId === where.organizationId && e.id > where.id.gt,
      );
      rows.sort((a, b) => (a.id < b.id ? -1 : 1));
      return rows.slice(0, take ?? rows.length);
    },
  },
  employee: {
    findMany: async ({ where }) =>
      EMPLOYEES.filter(
        (e) => e.organizationId === where.organizationId && where.id.in.includes(e.id),
      ),
  },
};

const permissionChecker = {
  async resolveEffectivePermissions(actor) {
    if (actor.adminId === ADMINS.manager) return MANAGER_EFFECTIVE;
    if (actor.adminId === ADMINS.viewPageOnly) return VIEW_PAGE_ONLY_EFFECTIVE;
    return EMPLOYEE_EFFECTIVE;
  },
};

function reset() {
  events.length = 0;
  nextId = 1n;
  return new DailyTaskRealtimeService(prisma, permissionChecker);
}

const poll = (service, adminId) =>
  service.poll(
    { organizationId: ORG, adminId, isPlatformSuperAdmin: false },
    '0',
    0,
    new AbortController().signal,
  );

test('assignment events reach only affected assignee admins', async () => {
  const service = reset();
  await service.recordEvent({
    organizationId: ORG,
    dailyTaskId: 'task-1',
    type: 'ASSIGNEES_CHANGED',
    recipientAdminIds: [ADMINS.sachin],
    notifyOrganizationManagers: true,
    metadata: { toEmployeeIds: ['emp-sachin'] },
  });

  assert.equal((await poll(service, ADMINS.sachin)).events.length, 1);
  assert.equal((await poll(service, ADMINS.akshay)).events.length, 0);
});

test('View Page-only employees do not receive organization manager events', async () => {
  const service = reset();
  await service.recordEvent({
    organizationId: ORG,
    dailyTaskId: 'task-1',
    type: 'TASK_CREATED',
    recipientAdminIds: [ADMINS.sachin],
    notifyOrganizationManagers: true,
  });
  assert.equal((await poll(service, ADMINS.viewPageOnly)).events.length, 0);
});

test('organization managers receive manager-flagged events with metadata', async () => {
  const service = reset();
  await service.recordEvent({
    organizationId: ORG,
    dailyTaskId: 'task-2',
    type: 'ASSIGNEES_CHANGED',
    recipientAdminIds: [ADMINS.sachin],
    notifyOrganizationManagers: true,
    metadata: { toEmployeeIds: ['emp-sachin'] },
  });

  const managerPoll = await poll(service, ADMINS.manager);
  assert.equal(managerPoll.events.length, 1);
  assert.deepEqual(managerPoll.events[0].metadata, { toEmployeeIds: ['emp-sachin'] });
});

test("assignee recipients get the change signal without other employees' ids", async () => {
  const service = reset();
  await service.recordEvent({
    organizationId: ORG,
    dailyTaskId: 'task-3',
    type: 'ASSIGNEES_CHANGED',
    recipientAdminIds: [ADMINS.akshay],
    notifyOrganizationManagers: true,
    metadata: { fromEmployeeIds: ['emp-akshay'], toEmployeeIds: ['emp-sachin'] },
  });
  const [event] = (await poll(service, ADMINS.akshay)).events;
  assert.equal(event.taskId, 'task-3');
  assert.equal(event.metadata, null);
});

test('reassignment notifies the removed and the new assignee, never other organizations', async () => {
  const service = reset();
  const publisher = new DailyTaskRealtimePublisher(service, prisma);
  await publisher.publishAssigneesChanged({
    organizationId: ORG,
    taskId: 'task-4',
    fromEmployeeIds: ['emp-akshay', null],
    toEmployeeIds: ['emp-sachin', 'emp-other-org'],
  });
  assert.equal(events.length, 1);
  assert.deepEqual([...events[0].recipientAdminIds].sort(), [ADMINS.akshay, ADMINS.sachin].sort());
});

test('a realtime write failure never fails the committed task change', async () => {
  const failing = {
    recordEvent: async () => {
      throw new Error('database unavailable');
    },
  };
  const publisher = new DailyTaskRealtimePublisher(failing, prisma);
  await publisher.publishTaskChange({
    organizationId: ORG,
    taskId: 'task-5',
    type: 'TASK_UPDATED',
    assigneeEmployeeIds: ['emp-akshay'],
  });
  await publisher.publishAssigneesChanged({
    organizationId: ORG,
    taskId: 'task-5',
    fromEmployeeIds: [],
    toEmployeeIds: ['emp-akshay'],
  });
});
