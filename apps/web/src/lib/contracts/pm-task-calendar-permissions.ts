import type { PermissionKey } from './permissions';

export const PM_TASK_CALENDAR_VIEW_KEY =
  'project_management.task_calendar.view' as const satisfies PermissionKey;

export const PM_TASK_CALENDAR_PERMISSION_KEYS = [
  PM_TASK_CALENDAR_VIEW_KEY,
] as const satisfies readonly PermissionKey[];

export function expandLegacyPmTaskCalendarPermissions(_keys: Set<PermissionKey>): void {}

export function canViewOrganizationTaskCalendar(
  effective: ReadonlySet<PermissionKey>,
  isPlatformSuperAdmin = false,
): boolean {
  if (isPlatformSuperAdmin) return true;
  return effective.has(PM_TASK_CALENDAR_VIEW_KEY);
}
