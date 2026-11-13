import {
  isSuperAdminPortalSlug,
  LEGACY_SUPER_ADMIN_PORTAL_SLUG,
  PERMISSION_KEYS,
  SYSTEM_ROLE_KEYS,
  type PermissionKey,
} from './permissions.js';

export { isSuperAdminPortalSlug, LEGACY_SUPER_ADMIN_PORTAL_SLUG };

/** True when the member holds every registered application permission (Super Admin effective access). */
export function hasUnrestrictedOrgPermissions(
  permissions: ReadonlySet<PermissionKey> | readonly PermissionKey[],
): boolean {
  const granted =
    permissions instanceof Set ? permissions : new Set<PermissionKey>(permissions);
  if (granted.size < PERMISSION_KEYS.length) return false;
  return PERMISSION_KEYS.every((key) => granted.has(key));
}

export function rolePortalSlugGrantsUnrestrictedAccess(portalSlug: string): boolean {
  return isSuperAdminPortalSlug(portalSlug);
}

/** Canonical Super Admin portal segment for routing. */
export function superAdminPortalSegment(): string {
  return SYSTEM_ROLE_KEYS.superAdmin;
}
