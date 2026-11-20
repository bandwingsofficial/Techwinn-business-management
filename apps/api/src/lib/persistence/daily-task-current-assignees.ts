import type { Prisma } from '../../generated/prisma/client.js';
import { LINKED_EMPLOYEE_WHERE } from './employee-platform-admin-link.js';

/**
 * Daily task assignee rows with a null `employeeId` are historical (former employee unlinked).
 * They must never represent the current assignment in UI or dashboards.
 */

/** Active assignee rows only — excludes historical unlink rows and inactive employee records. */
export const CURRENT_DAILY_TASK_ASSIGNEE_WHERE = {
  employeeId: { not: null },
  employee: { ...LINKED_EMPLOYEE_WHERE },
} satisfies Prisma.DailyTaskAssigneeWhereInput;
export type DailyTaskAssigneeNameRow = {
  readonly id?: string;
  readonly employeeId: string | null;
  readonly historicalDisplayName?: string | null;
  readonly employee?: { readonly displayName: string } | null;
  readonly createdAt?: Date | null;
};

export function isCurrentDailyTaskAssigneeRow(row: DailyTaskAssigneeNameRow): boolean {
  return row.employeeId != null && row.employeeId.trim().length > 0;
}

export function sortCurrentDailyTaskAssigneeRows<T extends DailyTaskAssigneeNameRow>(
  rows: readonly T[],
): T[] {
  return [...rows]
    .filter(isCurrentDailyTaskAssigneeRow)
    .sort((left, right) => {
      const leftTime = left.createdAt?.getTime() ?? 0;
      const rightTime = right.createdAt?.getTime() ?? 0;
      if (leftTime !== rightTime) return leftTime - rightTime;
      return (left.employeeId ?? '').localeCompare(right.employeeId ?? '');
    });
}

export function resolveDailyTaskAssigneeDisplayName(row: DailyTaskAssigneeNameRow): string {
  const fromEmployee = row.employee?.displayName?.trim();
  if (fromEmployee) return fromEmployee;
  return row.historicalDisplayName?.trim() || 'Former employee';
}

/** Comma-separated current assignee names for tables and summaries. */
export function formatCurrentDailyTaskAssigneeNames(rows: readonly DailyTaskAssigneeNameRow[]): string {
  const current = sortCurrentDailyTaskAssigneeRows(rows);
  if (current.length === 0) return '—';
  return current.map((row) => resolveDailyTaskAssigneeDisplayName(row)).join(', ');
}