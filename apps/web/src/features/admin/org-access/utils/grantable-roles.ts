import { isSuperAdminPortalSlug } from '@techwin/contracts';
import type { OrgRoleListItem } from '../types';
import type { GrantableRoleActor } from './role-policy';

/**
 * Roles the signed-in user may assign: active, not the owner role (platform super admins only),
 * and never granting a permission the user does not hold. The API enforces the same rules.
 */
export function selectGrantableRoles(
  roles: readonly OrgRoleListItem[],
  actor: GrantableRoleActor,
): readonly OrgRoleListItem[] {
  if (actor.isPlatformSuperAdmin) return roles.filter((role) => role.status === 'ACTIVE');
  return roles.filter(
    (role) =>
      role.status === 'ACTIVE' &&
      !isSuperAdminPortalSlug(role.portalSlug) &&
      role.permissionKeys.every((key) => actor.permissions.has(key)),
  );
}

/** Roles offered when provisioning a new sign-in account (never includes Super Admin). */
export function selectCreatableAccountRoles(
  roles: readonly OrgRoleListItem[],
  actor: GrantableRoleActor,
): readonly OrgRoleListItem[] {
  return selectGrantableRoles(roles, actor).filter(
    (role) => !isSuperAdminPortalSlug(role.portalSlug),
  );
}

/** Same exclusion as create-account role pickers — used for Edit Account. */
export const selectEditableAccountRoles = selectCreatableAccountRoles;
