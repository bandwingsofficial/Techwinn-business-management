import type { PermissionKey } from './permissions.js';

export const EMPLOYEE_LEAVE_RECORDS_VIEW: PermissionKey = 'employee_leave_records.view';

export const EMPLOYEE_LEAVE_RECORDS_PERMISSION_KEYS = [
  EMPLOYEE_LEAVE_RECORDS_VIEW,
] as const satisfies readonly PermissionKey[];

/**
 * Former Employee Leave Records page keys (role editor only).
 * They must not grant access to `/admin/employee-leave-records` after migration.
 */
export const LEGACY_EMPLOYEE_LEAVE_RECORDS_PAGE_PERMISSION_KEYS = [
  'leave.balances.read',
  'leave.balances.adjust',
  'leave_balances.view',
] as const satisfies readonly PermissionKey[];