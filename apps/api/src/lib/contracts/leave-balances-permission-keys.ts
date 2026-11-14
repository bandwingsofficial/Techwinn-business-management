import type { PermissionKey } from './permissions.js';

export const LEAVE_BALANCES_VIEW: PermissionKey = 'leave_balances.view';
export const LEAVE_BALANCES_CREATE: PermissionKey = 'leave_balances.create';
export const LEAVE_BALANCES_UPDATE: PermissionKey = 'leave_balances.update';
export const LEAVE_BALANCES_TOGGLE_STATUS: PermissionKey = 'leave_balances.toggle_status';
export const LEAVE_BALANCES_DELETE: PermissionKey = 'leave_balances.delete';

export const LEAVE_BALANCES_PERMISSION_KEYS = [
  LEAVE_BALANCES_VIEW,
  LEAVE_BALANCES_CREATE,
  LEAVE_BALANCES_UPDATE,
  LEAVE_BALANCES_TOGGLE_STATUS,
  LEAVE_BALANCES_DELETE,
] as const satisfies readonly PermissionKey[];

/** Policy CRUD keys superseded by `leave_balances.*` (role editor / hierarchy). */
export const LEGACY_LEAVE_BALANCES_POLICY_PERMISSION_KEYS = [
  'leave.config.read',
  'leave.config.manage',
  'leave.allocations.read',
  'leave.allocations.manage',
] as const satisfies readonly PermissionKey[];

const LEGACY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  [LEAVE_BALANCES_VIEW]: ['leave.config.read', 'leave.allocations.read'],
  [LEAVE_BALANCES_CREATE]: ['leave.config.manage', 'leave.allocations.manage'],
  [LEAVE_BALANCES_UPDATE]: ['leave.config.manage', 'leave.allocations.manage'],
  [LEAVE_BALANCES_TOGGLE_STATUS]: ['leave.config.manage'],
  [LEAVE_BALANCES_DELETE]: ['leave.config.manage'],
};

const LEGACY_TO_CANONICAL = new Map<string, PermissionKey>();
for (const [canonical, legacyKeys] of Object.entries(LEGACY_ALIASES)) {
  for (const legacy of legacyKeys) {
    LEGACY_TO_CANONICAL.set(legacy, canonical as PermissionKey);
  }
}

export function expandLegacyLeaveBalancesPolicyPermissions(keys: Set<PermissionKey>): void {
  for (const [legacy, canonical] of LEGACY_TO_CANONICAL) {
    if (keys.has(legacy as PermissionKey)) keys.add(canonical);
  }
}

export function hasLeaveBalancesPermission(
  effective: ReadonlySet<PermissionKey>,
  key: PermissionKey,
): boolean {
  if (effective.has(key)) return true;
  for (const legacy of LEGACY_ALIASES[key] ?? []) {
    if (effective.has(legacy as PermissionKey)) return true;
  }
  return false;
}