import type { PermissionKey } from './permissions.js';
import { PM_TASK_CALENDAR_VIEW_KEY } from './pm-task-calendar-permissions.js';
import { canViewOrganizationProjectTasks, canViewOwnDailyTasks } from './task-visibility.js';

export const PROJECT_MANAGEMENT_VIEW_KEY = 'projects.read' as const satisfies PermissionKey;

/** Open the Task Calendar page (not implied data for both types). */
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

/** Org-wide project plan rows on the calendar (managers). Assignment-only otherwise. */
export function canViewOrganizationProjectTasksOnCalendar(
  effective: ReadonlySet<PermissionKey>,
  isPlatformSuperAdmin = false,
): boolean {
  return canViewOrganizationProjectTasks(effective, isPlatformSuperAdmin);
}
