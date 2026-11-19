import type { Prisma } from '../../generated/prisma/client.js';

/**
 * Employee master rows that may act as the signed-in account's identity and receive
 * assignment-scoped task visibility. Deactivated or soft-deleted rows never qualify, so a
 * removed employee can never be resolved for, or substituted into, another session.
 */
export const LINKED_EMPLOYEE_WHERE = {
  deactivatedAt: null,
  deletedAt: null,
  employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] as const },
} satisfies Pick<Prisma.EmployeeWhereInput, 'deactivatedAt' | 'deletedAt' | 'employmentStatus'>;

/** The only identity link: `Employee.platformAdminId` = authenticated admin id, same organization. */
export function employeeLinkedToAdminWhere(
  organizationId: string,
  platformAdminId: string,
): Prisma.EmployeeWhereInput {
  return {
    organizationId,
    platformAdminId,
    ...LINKED_EMPLOYEE_WHERE,
  };
}

/** Prisma filter: task has a live (non-historical) assignee row for one of the employee ids. */
export function dailyTaskAssignedToEmployeeIdsWhere(
  employeeIds: readonly string[],
): Prisma.DailyTaskWhereInput {
  if (employeeIds.length === 0) {
    return { id: { in: [] } };
  }
  return {
    assignees: {
      some: {
        employeeId: { in: [...employeeIds] },
      },
    },
  };
}

export function dailyTaskAssignedToEmployeeIdWhere(employeeId: string): Prisma.DailyTaskWhereInput {
  return {
    assignees: {
      some: {
        employeeId,
      },
    },
  };
}
