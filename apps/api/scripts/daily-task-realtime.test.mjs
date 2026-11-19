/**
 * Daily task realtime poll filters events by recipient admin id and org-manager visibility.
 * Run after `pnpm run build`: `node --test scripts/daily-task-realtime.test.mjs`
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';

import { EMPLOYEE_PORTAL_PERMISSIONS } from '../dist/lib/contracts/index.js';
import { uniquePermissionKeys } from '../dist/modules/org-access/infrastructure/persistence/prisma/repositories/org-access-persistence.shared.js';
import { DailyTaskRealtimeService } from '../dist/modules/project-management/modules/daily-tasks/application/services/daily-task-realtime.service.js';

const ORG = 'org-1';
const ADMINS = { sachin: 'admin-sachin', akshay: 'admin-akshay', manager: 'admin-manager' };

const EMPLOYEE_EFFECTIVE = uniquePermissionKeys([...EMPLOYEE_PORTAL_PERMISSIONS]);

const MANAGER_EFFECTIVE = uniquePermissionKeys([
  ...EMPLOYEE_EFFECTIVE,
  'project_management.daily_tasks.view',
]);

const events = [];
let nextId = 1n;

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
    findMany: async ({ where, orderBy, take }) => {
      let rows = events.filter(
        (e) => e.organizationId === where.organizationId && e.id > where.id.gt,
      );
      rows.sort((a, b) => (a.id < b.id ? -1 : 1));
      return rows.slice(0, take ?? rows.length);
    },
  },
};

const permissionChecker = {
  async resolveEffectivePermissions(actor) {
    if (actor.adminId === ADMINS.manager) return MANAGER_EFFECTIVE;
    return EMPLOYEE_EFFECTIVE;
  },
};

test('assignment events reach only affected assignee admins', async () => {
  events.length = 0;
  nextId = 1n;
  const service = new DailyTaskRealtimeService(prisma, permissionChecker);
  await service.recordEvent({
    organizationId: ORG,
    dailyTaskId: 'task-1',
    type: 'ASSIGNEES_CHANGED',
    recipientAdminIds: [ADMINS.sachin],
    notifyOrganizationManagers: true,
    metadata: { toEmployeeIds: ['emp-sachin'] },
  });

  const sachinPoll = await service.poll(
    { organizationId: ORG, adminId: ADMINS.sachin, isPlatformSuperAdmin: false },
    '0',
    0,
    new AbortController().signal,
  );
  const akshayPoll = await service.poll(
    { organizationId: ORG, adminId: ADMINS.akshay, isPlatformSuperAdmin: false },
    '0',
    0,
    new AbortController().signal,
  );

  assert.equal(sachinPoll.events.length, 1);
  assert.equal(akshayPoll.events.length, 0);
});

test('organization managers still receive manager-flagged events', async () => {
  events.length = 0;
  nextId = 1n;
  const service = new DailyTaskRealtimeService(prisma, permissionChecker);
  await service.recordEvent({
    organizationId: ORG,
    dailyTaskId: 'task-2',
    type: 'ASSIGNEES_CHANGED',
    recipientAdminIds: [ADMINS.sachin],
    notifyOrganizationManagers: true,
    metadata: {},
  });

  const managerPoll = await service.poll(
    { organizationId: ORG, adminId: ADMINS.manager, isPlatformSuperAdmin: false },
    '0',
    0,
    new AbortController().signal,
  );
  assert.equal(managerPoll.events.length, 1);
});