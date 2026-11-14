import { PERMISSION_KEYS, SYSTEM_ROLE_KEYS, type PermissionKey } from '#contracts';

export { SYSTEM_ROLE_KEYS };

export const SUPER_ADMIN_PERMISSIONS: readonly PermissionKey[] = PERMISSION_KEYS;

/** @deprecated Use {@link SUPER_ADMIN_PERMISSIONS}. */
export const OWNER_PERMISSIONS = SUPER_ADMIN_PERMISSIONS;

/** Only Super Admin is bootstrapped as a protected system role. */
export const DEFAULT_SYSTEM_ROLES: readonly {
  portalSlug: string;
  name: string;
  description: string;
  permissions: readonly PermissionKey[];
}[] = [
  {
    portalSlug: SYSTEM_ROLE_KEYS.superAdmin,
    name: 'Super Admin',
    description: 'Full organization administration including users and roles.',
    permissions: SUPER_ADMIN_PERMISSIONS,
  },
];