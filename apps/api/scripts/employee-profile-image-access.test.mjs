/**
 * Stored employee profile photo access — the photo shown for a session always comes from the
 * employee linked to that session (`Employee.platformAdminId`), never from a name match.
 * Run after `pnpm run build`: `node --test scripts/employee-profile-image-access.test.mjs`
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';

import { EmployeeProfileImageAccessService } from '../dist/modules/employees/application/services/employee-profile-image-access.service.js';

const ORG = 'org-1';

function createService() {
  const employees = [
    {
      id: 'emp-akshay',
      organizationId: ORG,
      platformAdminId: 'admin-akshay',
      profileImageStoredObjectId: 'obj-akshay',
      employmentStatus: 'ACTIVE',
      deactivatedAt: null,
      deletedAt: null,
    },
    {
      id: 'emp-sachin',
      organizationId: ORG,
      platformAdminId: 'admin-sachin',
      profileImageStoredObjectId: 'obj-sachin',
      employmentStatus: 'ACTIVE',
      deactivatedAt: null,
      deletedAt: null,
    },
  ];
  const prisma = {
    employee: {
      findFirst: async ({ where }) =>
        employees.find(
          (e) =>
            e.organizationId === where.organizationId &&
            e.platformAdminId === where.platformAdminId &&
            e.deactivatedAt === where.deactivatedAt &&
            e.deletedAt === where.deletedAt &&
            where.employmentStatus.in.includes(e.employmentStatus),
        ) ?? null,
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

test("an employee cannot open another employee's photo", async () => {
  const { service } = createService();
  await assert.rejects(open(service, 'admin-akshay', 'obj-sachin'), ForbiddenException);
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
  }
});

test('employee directory viewers and Super Admin can open any photo in the organization', async () => {
  const { service } = createService();
  await open(service, 'admin-hr', 'obj-sachin', ['employees.view']);
  await open(service, 'admin-hr', 'obj-sachin', ['employees.read']);
  await open(service, 'admin-root', 'obj-sachin', [], true);
});

test("task-only permissions do not unlock other employees' photos", async () => {
  const { service } = createService();
  await assert.rejects(
    open(service, 'admin-akshay', 'obj-sachin', [
      'tasks.read',
      'project_management.daily_tasks.view',
    ]),
    ForbiddenException,
  );
});
