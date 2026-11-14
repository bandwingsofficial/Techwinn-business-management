import type { PermissionKey } from './permissions';

export const USERS_VIEW: PermissionKey = 'users.view';
export const USERS_CREATE: PermissionKey = 'users.create';
export const USERS_STATUS_UPDATE: PermissionKey = 'users.status.update';
export const USERS_UPDATE: PermissionKey = 'users.update';
export const USERS_DELETE: PermissionKey = 'users.delete';
export const USERS_PASSWORD_RESET: PermissionKey = 'users.password.reset';

export const USERS_PERMISSION_KEYS = [
  USERS_VIEW,
  USERS_CREATE,
  USERS_STATUS_UPDATE,
  USERS_UPDATE,
  USERS_DELETE,
  USERS_PASSWORD_RESET,
] as const satisfies readonly PermissionKey[];

/** Superseded keys removed from the Users role-editor page (catalog legacy only). */
export const LEGACY_USERS_PAGE_PERMISSION_KEYS = [
  'users.read',
  'users.deactivate',
  'users.reset_password',
  'users.manage_roles',
] as const satisfies readonly PermissionKey[];

const LEGACY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  [USERS_VIEW]: ['users.read'],
  [USERS_CREATE]: ['memberships.manage'],
  [USERS_STATUS_UPDATE]: ['users.deactivate', 'memberships.manage'],
  [USERS_UPDATE]: ['users.manage_roles'],
  [USERS_DELETE]: ['users.deactivate', 'memberships.manage'],
  [USERS_PASSWORD_RESET]: ['users.reset_password'],
};

export function hasUsersPermission(
  effective: ReadonlySet<PermissionKey>,
  key: PermissionKey,
): boolean {
  if (effective.has(key)) return true;
  for (const legacy of LEGACY_ALIASES[key] ?? []) {
    if (effective.has(legacy as PermissionKey)) return true;
  }
  return false;
}