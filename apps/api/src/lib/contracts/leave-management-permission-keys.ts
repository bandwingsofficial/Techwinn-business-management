import type { LeaveRequestStatus } from './leave.js';
import type { PermissionKey } from './permissions.js';

export const LEAVE_MANAGEMENT_VIEW: PermissionKey = 'leave.management.view';
export const LEAVE_MANAGEMENT_DETAILS_VIEW: PermissionKey = 'leave.management.details.view';
export const LEAVE_MANAGEMENT_APPROVE: PermissionKey = 'leave.management.approve';
export const LEAVE_MANAGEMENT_REJECT: PermissionKey = 'leave.management.reject';
export const LEAVE_MANAGEMENT_TAB_PENDING: PermissionKey = 'leave.management.tab.pending';
export const LEAVE_MANAGEMENT_TAB_APPROVED: PermissionKey = 'leave.management.tab.approved';
export const LEAVE_MANAGEMENT_TAB_REJECTED: PermissionKey = 'leave.management.tab.rejected';
export const LEAVE_MANAGEMENT_TAB_ALL: PermissionKey = 'leave.management.tab.all';

export const LEAVE_MANAGEMENT_PERMISSION_KEYS = [
  LEAVE_MANAGEMENT_VIEW,
  LEAVE_MANAGEMENT_DETAILS_VIEW,
  LEAVE_MANAGEMENT_APPROVE,
  LEAVE_MANAGEMENT_REJECT,
  LEAVE_MANAGEMENT_TAB_PENDING,
  LEAVE_MANAGEMENT_TAB_APPROVED,
  LEAVE_MANAGEMENT_TAB_REJECTED,
  LEAVE_MANAGEMENT_TAB_ALL,
] as const satisfies readonly PermissionKey[];

/** Admin list/approve/reject keys superseded by `leave.management.*` in the role editor. */
export const LEGACY_LEAVE_MANAGEMENT_ADMIN_PERMISSION_KEYS = [
  'leave.requests.read_all',
  'leave.requests.approve',
  'leave.requests.reject',
] as const satisfies readonly PermissionKey[];

export type LeaveManagementStatusTab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const TAB_PERMISSION_BY_STATUS: Readonly<Record<LeaveManagementStatusTab, PermissionKey>> = {
  PENDING: LEAVE_MANAGEMENT_TAB_PENDING,
  APPROVED: LEAVE_MANAGEMENT_TAB_APPROVED,
  REJECTED: LEAVE_MANAGEMENT_TAB_REJECTED,
  ALL: LEAVE_MANAGEMENT_TAB_ALL,
};

const LEGACY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  [LEAVE_MANAGEMENT_VIEW]: ['leave.requests.read_all'],
  [LEAVE_MANAGEMENT_DETAILS_VIEW]: ['leave.requests.read_all'],
  [LEAVE_MANAGEMENT_APPROVE]: ['leave.requests.approve'],
  [LEAVE_MANAGEMENT_REJECT]: ['leave.requests.reject'],
  [LEAVE_MANAGEMENT_TAB_PENDING]: ['leave.requests.read_all'],
  [LEAVE_MANAGEMENT_TAB_APPROVED]: ['leave.requests.read_all'],
  [LEAVE_MANAGEMENT_TAB_REJECTED]: ['leave.requests.read_all'],
  [LEAVE_MANAGEMENT_TAB_ALL]: ['leave.requests.read_all'],
};

export function leaveManagementTabPermission(tab: LeaveManagementStatusTab): PermissionKey {
  return TAB_PERMISSION_BY_STATUS[tab];
}

export function leaveManagementTabPermissionForListFilter(
  status: LeaveRequestStatus | undefined,
): PermissionKey {
  if (status === undefined) return LEAVE_MANAGEMENT_TAB_ALL;
  return leaveManagementTabPermissionForRequestStatus(status);
}

export function leaveManagementTabPermissionForRequestStatus(
  status: LeaveRequestStatus,
): PermissionKey {
  switch (status) {
    case 'PENDING':
      return LEAVE_MANAGEMENT_TAB_PENDING;
    case 'APPROVED':
      return LEAVE_MANAGEMENT_TAB_APPROVED;
    case 'REJECTED':
      return LEAVE_MANAGEMENT_TAB_REJECTED;
    default:
      return LEAVE_MANAGEMENT_TAB_ALL;
  }
}

export function hasLeaveManagementPermission(
  effective: ReadonlySet<PermissionKey>,
  key: PermissionKey,
): boolean {
  if (effective.has(key)) return true;
  for (const legacy of LEGACY_ALIASES[key] ?? []) {
    if (effective.has(legacy as PermissionKey)) return true;
  }
  return false;
}