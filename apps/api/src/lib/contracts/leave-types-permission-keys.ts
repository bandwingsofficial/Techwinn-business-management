import type { PermissionKey } from './permissions.js';

export const LEAVE_TYPES_VIEW: PermissionKey = 'leave_types.view';
export const LEAVE_TYPES_CREATE: PermissionKey = 'leave_types.create';
export const LEAVE_TYPES_UPDATE: PermissionKey = 'leave_types.update';
export const LEAVE_TYPES_TOGGLE_STATUS: PermissionKey = 'leave_types.toggle_status';
export const LEAVE_TYPES_DELETE: PermissionKey = 'leave_types.delete';
export const LEAVE_TYPES_EXPORT: PermissionKey = 'leave_types.export';

export const LEAVE_TYPES_PERMISSION_KEYS = [
  LEAVE_TYPES_VIEW,
  LEAVE_TYPES_CREATE,
  LEAVE_TYPES_UPDATE,
  LEAVE_TYPES_TOGGLE_STATUS,
  LEAVE_TYPES_DELETE,
  LEAVE_TYPES_EXPORT,
] as const satisfies readonly PermissionKey[];

/** Pre-rename keys accepted during permission checks only. */
const LEGACY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  [LEAVE_TYPES_VIEW]: ['leave.types.read'],
  [LEAVE_TYPES_CREATE]: ['leave.types.create'],
  [LEAVE_TYPES_UPDATE]: ['leave.types.update'],
  [LEAVE_TYPES_TOGGLE_STATUS]: ['leave.types.manage'],
  [LEAVE_TYPES_DELETE]: ['leave.types.manage'],
};

export const LEGACY_LEAVE_TYPES_PERMISSION_KEYS = [
  'leave.types.read',
  'leave.types.create',
  'leave.types.update',
  'leave.types.manage',
] as const satisfies readonly PermissionKey[];

const LEGACY_TO_CANONICAL = new Map<string, PermissionKey>();
for (const [canonical, legacyKeys] of Object.entries(LEGACY_ALIASES)) {
  for (const legacy of legacyKeys) {
    LEGACY_TO_CANONICAL.set(legacy, canonical as PermissionKey);
  }
}

/** Backfill canonical keys from legacy `leave.types.*` role grants. */
export function expandLegacyLeaveTypesPermissions(keys: Set<PermissionKey>): void {
  for (const [legacy, canonical] of LEGACY_TO_CANONICAL) {
    if (keys.has(legacy as PermissionKey)) keys.add(canonical);
  }
}

export function hasLeaveTypesPermission(
  effective: ReadonlySet<PermissionKey>,
  key: PermissionKey,
): boolean {
  if (effective.has(key)) return true;
  for (const legacy of LEGACY_ALIASES[key] ?? []) {
    if (effective.has(legacy as PermissionKey)) return true;
  }
  return false;
}