'use client';

import { AdminDailyTasksWorkspace } from '@/features/admin/daily-tasks/components/admin-daily-tasks-workspace';
import { canViewOrganizationDailyTasks } from '@/features/admin/daily-tasks/utils/daily-tasks-organization-scope';
import { EmployeeDailyTasksWorkspace } from '@/features/employee/components/employee-daily-tasks-workspace';
import { usePermissions } from '@/features/auth/components/permissions-provider';

/**
 * Same URL (`/employee/daily-tasks`) serves org-wide Daily Tasks or self-service my tasks
 * depending on effective permissions — portal prefix is unchanged.
 */
export function EmployeeDailyTasksRoute() {
  const { has } = usePermissions();
  if (canViewOrganizationDailyTasks(has)) {
    return <AdminDailyTasksWorkspace />;
  }
  return <EmployeeDailyTasksWorkspace />;
}
