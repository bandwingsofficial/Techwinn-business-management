import type { PermissionKey } from './permissions';
import { PM_TASK_CALENDAR_VIEW_KEY } from './pm-task-calendar-permissions';
import { canViewOrganizationProjectTasks, canViewOwnDailyTasks } from './task-visibility';

export const PROJECT_MANAGEMENT_VIEW_KEY = 'projects.read' as const satisfies PermissionKey;

export function canAccessTaskCalendar(
  effective: ReadonlySet<PermissionKey>,
  isPlatformSuperAdmin = false,
): boolean {
  if (isPlatformSuperAdmin) return true;
  return effective.has(PM_TASK_CALENDAR_VIEW_KEY);
}

/** Daily task rows on the calendar; organization vs own scope is decided separately. */
export function canViewTaskCalendarDailyTasks(
  effective: ReadonlySet<PermissionKey>,
  isPlatformSuperAdmin = false,
): boolean {
  if (isPlatformSuperAdmin) return true;
  return canViewOwnDailyTasks(effective);
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
  return canViewOrganizationProjectTasks(effective, isPlatformSuperAdmin);
}
