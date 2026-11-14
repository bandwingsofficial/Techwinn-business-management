import type { PermissionKey } from './permissions';

export const ATTENDANCE_RECORDS_PAGE_VIEW: PermissionKey = 'attendance.records.view';
export const ATTENDANCE_RECORDS_ADD: PermissionKey = 'attendance.records.add';
export const ATTENDANCE_RECORDS_VIEW_DETAILS: PermissionKey = 'attendance.records.view_details';
export const ATTENDANCE_RECORDS_EDIT: PermissionKey = 'attendance.records.edit';
export const ATTENDANCE_RECORDS_CALENDAR_VIEW: PermissionKey = 'attendance.records.calendar_view';
export const ATTENDANCE_RECORDS_MANAGE_SETTINGS: PermissionKey = 'attendance.records.manage_settings';

export const ATTENDANCE_PUNCH_PAGE_VIEW: PermissionKey = 'attendance.punch.view';
export const ATTENDANCE_PUNCH_IN: PermissionKey = 'attendance.punch.punch_in';
export const ATTENDANCE_PUNCH_OUT: PermissionKey = 'attendance.punch.punch_out';
export const ATTENDANCE_PUNCH_VIEW_DETAILS: PermissionKey = 'attendance.punch.view_details';
export const ATTENDANCE_PUNCH_VIEW_ALL: PermissionKey = 'attendance.punch.view_all';

const LEGACY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  [ATTENDANCE_RECORDS_ADD]: ['attendance.records.create'],
  [ATTENDANCE_RECORDS_CALENDAR_VIEW]: ['attendance.calendar.view'],
  [ATTENDANCE_RECORDS_MANAGE_SETTINGS]: ['attendance.manage_settings'],
  [ATTENDANCE_PUNCH_IN]: ['attendance.punch_in'],
  [ATTENDANCE_PUNCH_OUT]: ['attendance.punch_out'],
};

export function hasAttendancePermission(
  effective: ReadonlySet<PermissionKey>,
  key: PermissionKey,
): boolean {
  if (effective.has(key)) return true;
  const legacy = LEGACY_ALIASES[key];
  if (!legacy) return false;
  return legacy.some((k) => effective.has(k as PermissionKey));
}