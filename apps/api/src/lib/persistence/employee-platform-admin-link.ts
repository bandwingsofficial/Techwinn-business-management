import type { Prisma } from '../../generated/prisma/client.js';

/** Active employee profiles that may sign in and receive assignment-scoped task visibility. */
export const LINKED_EMPLOYEE_WHERE = {
  deactivatedAt: null,
  employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] as const },
} satisfies Pick<Prisma.EmployeeWhereInput, 'deactivatedAt' | 'employmentStatus'>;

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

/** Prisma filter: task has an active (non-historical) assignee in the given employee ids. */
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