/**
 * Stored employee profile photo access — a photo is visible to whoever may already see that
 * employee on a task, resolved from the session (`Employee.platformAdminId`), never by name.
 * Run after `pnpm run build`: `node --test scripts/employee-profile-image-access.test.mjs`
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';

import { EmployeeProfileImageAccessService } from '../dist/modules/employees/application/services/employee-profile-image-access.service.js';

const ORG = 'org-1';

function createService() {
  const live = { employmentStatus: 'ACTIVE', deactivatedAt: null, deletedAt: null };
  const employees = [
    {
      id: 'emp-akshay',
      organizationId: ORG,
      platformAdminId: 'admin-akshay',
      profileImageStoredObjectId: 'obj-akshay',
      ...live,
    },
    {
      id: 'emp-sachin',
      organizationId: ORG,
      platformAdminId: 'admin-sachin',
      profileImageStoredObjectId: 'obj-sachin',
      ...live,
    },
    {
      id: 'emp-rahul',
      organizationId: ORG,
      platformAdminId: 'admin-rahul',
      profileImageStoredObjectId: 'obj-rahul',
      ...live,
    },
  ];
  /** task-shared: Akshay + Sachin; task-rahul: Rahul only. */
  const assignees = [
    { dailyTaskId: 'task-shared', organizationId: ORG, employeeId: 'emp-akshay' },
    { dailyTaskId: 'task-shared', organizationId: ORG, employeeId: 'emp-sachin' },
    { dailyTaskId: 'task-rahul', organizationId: ORG, employeeId: 'emp-rahul' },
  ];
  const matchesEmployee = (e, where) =>
    Object.entries(where).every(([key, cond]) =>
      cond && typeof cond === 'object' && 'in' in cond ? cond.in.includes(e[key]) : e[key] === cond,
    );
  const prisma = {
    employee: {
      findFirst: async ({ where }) => employees.find((e) => matchesEmployee(e, where)) ?? null,
    },
    dailyTaskAssignee: {
      count: async ({ where }) =>
        assignees.filter(
          (a) =>
            a.organizationId === where.organizationId &&
            a.employeeId === where.employeeId &&
            assignees.some(
              (other) =>
                other.dailyTaskId === a.dailyTaskId &&
                other.employeeId === where.dailyTask.assignees.some.employeeId,
            ),
        ).length,
    },
  };
  return { service: new EmployeeProfileImageAccessService(prisma), employees };
}

const open = (service, adminId, storedObjectId, effective = [], isPlatformSuperAdmin = false) =>
  service.assertCanOpenStoredProfileImage({
    organizationId: ORG,
    adminId,
    isPlatformSuperAdmin,
    effective: new Set(effective),
    storedObjectId,
  });

test('an employee with no HR permissions can open their own photo', async () => {
  const { service } = createService();
  await open(service, 'admin-akshay', 'obj-akshay');
});

test("co-assignees on a shared task see each other's photos", async () => {
  const { service } = createService();
  await open(service, 'admin-akshay', 'obj-sachin');
  await open(service, 'admin-sachin', 'obj-akshay');
});

test('an employee cannot open the photo of someone they share no task with', async () => {
  const { service } = createService();
  await assert.rejects(open(service, 'admin-akshay', 'obj-rahul'), ForbiddenException);
  await assert.rejects(
    open(service, 'admin-akshay', 'obj-rahul', [
      'tasks.read',
      'project_management.daily_tasks.view',
      'project_management.daily_tasks.edit',
    ]),
    ForbiddenException,
  );
});

test('an unlinked account sharing a display name gets no photo', async () => {
  const { service } = createService();
  await assert.rejects(open(service, 'admin-akshay-namesake', 'obj-akshay'), ForbiddenException);
});

test('a soft-deleted or deactivated employee link no longer opens the photo', async () => {
  for (const patch of [{ deletedAt: new Date() }, { deactivatedAt: new Date() }]) {
    const { service, employees } = createService();
    Object.assign(employees[0], patch);
    await assert.rejects(open(service, 'admin-akshay', 'obj-akshay'), ForbiddenException);
    await assert.rejects(open(service, 'admin-akshay', 'obj-sachin'), ForbiddenException);
  }
});

test('organization task viewers, directory viewers and Super Admin see any photo in the org', async () => {
  const { service } = createService();
  await open(service, 'admin-lead', 'obj-rahul', ['project_management.daily_tasks.view_all']);
  await open(service, 'admin-hr', 'obj-rahul', ['employees.view']);
  await open(service, 'admin-hr', 'obj-rahul', ['employees.read']);
  await open(service, 'admin-root', 'obj-rahul', [], true);
});

test("task edit/assign alone does not unlock other employees' photos", async () => {
  const { service } = createService();
  await assert.rejects(
    open(service, 'admin-lead', 'obj-rahul', ['project_management.daily_tasks.edit']),
    ForbiddenException,
  );
});

test('an unknown stored object is refused for non-viewers', async () => {
  const { service } = createService();
  await assert.rejects(open(service, 'admin-akshay', 'obj-missing'), ForbiddenException);
});
