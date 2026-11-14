import type { PermissionKey } from './permissions';
import { hasUnrestrictedOrgPermissions } from './org-access-unrestricted';
import { PM_DAILY_TASKS_VIEW_KEY } from './pm-daily-tasks-permissions';
import { PM_TASK_CALENDAR_VIEW_KEY } from './pm-task-calendar-permissions';

export const PROJECT_MANAGEMENT_VIEW_KEY = 'projects.read' as const satisfies PermissionKey;

const ORGANIZATION_TASK_COLLABORATOR_KEYS = [
  'employees.view',
  'leads.read',
  'clients.read',
] as const satisfies readonly PermissionKey[];

export function canAccessTaskCalendar(
  effective: ReadonlySet<PermissionKey>,
  isPlatformSuperAdmin = false,
): boolean {
  if (isPlatformSuperAdmin) return true;
  return effective.has(PM_TASK_CALENDAR_VIEW_KEY);
}

export function canViewTaskCalendarDailyTasks(
  effective: ReadonlySet<PermissionKey>,
  isPlatformSuperAdmin = false,
): boolean {
  if (isPlatformSuperAdmin) return true;
  return effective.has(PM_DAILY_TASKS_VIEW_KEY);
}

export function canViewTaskCalendarProjectTasks(
  effective: ReadonlySet<PermissionKey>,
  isPlatformSuperAdmin = false,
): boolean {
  if (isPlatformSuperAdmin) return true;
  return effective.has(PROJECT_MANAGEMENT_VIEW_KEY);
}

export function canViewOrganizationProjectTasksOnCalendar(
  effective: ReadonlySet<PermissionKey>,
  isPlatformSuperAdmin = false,
): boolean {
  if (isPlatformSuperAdmin) return true;
  if (!effective.has(PROJECT_MANAGEMENT_VIEW_KEY)) return false;
  if (hasUnrestrictedOrgPermissions(effective)) return true;
  if (
    effective.has('tasks.create') ||
    effective.has('tasks.assign') ||
    effective.has('tasks.update')
  ) {
    return true;
  }
  return ORGANIZATION_TASK_COLLABORATOR_KEYS.some((key) => effective.has(key));
}
