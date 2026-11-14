import {
  IMMUTABLE_ORG_ROLE_KEYS,
  isSuperAdminPortalSlug,
  type PermissionKey,
} from '@techwin/contracts';
import type { OrgRoleListItem } from '../types';

export function isImmutableOrgRole(role: { readonly portalSlug: string }): boolean {
  return IMMUTABLE_ORG_ROLE_KEYS.has(role.portalSlug) || isSuperAdminPortalSlug(role.portalSlug);
}

export function isSuperAdminOrgRole(role: { readonly portalSlug: string }): boolean {
  return isSuperAdminPortalSlug(role.portalSlug);
}

/** @deprecated Use {@link isSuperAdminOrgRole}. */
export const isOwnerOrgRole = isSuperAdminOrgRole;

export function isEditableOrgRole(role: OrgRoleListItem): boolean {
  return !isImmutableOrgRole(role);
}

export function immutableRoleReason(role: { readonly portalSlug: string }): string {
  if (isSuperAdminPortalSlug(role.portalSlug)) {
    return 'The Super Admin role is protected and cannot be changed, deactivated, or deleted.';
  }
  return 'This role is protected.';
}

export function roleHasMemberAssignments(role: Pick<OrgRoleListItem, 'memberCount'>): boolean {
  return role.memberCount > 0;
}

export function roleHasPendingInvitations(
  role: Pick<OrgRoleListItem, 'pendingInvitationCount'>,
): boolean {
  return role.pendingInvitationCount > 0;
}

/** Show activate/deactivate control. Immutable Owner/Admin roles never expose this. */
export function roleShowsStatusToggle(
  role: OrgRoleListItem,
  canUpdate: boolean,
): boolean {
  if (!canUpdate || isImmutableOrgRole(role)) return false;
  return true;
}

/** Show permanent delete control. Immutable Owner/Admin roles never expose this. */
export function roleShowsDeleteButton(role: OrgRoleListItem, canDelete: boolean): boolean {
  if (!canDelete || isImmutableOrgRole(role)) return false;
  return true;
}

export function roleStatusToggleLabel(role: OrgRoleListItem): string {
  if (role.status === 'ACTIVE') {
    if (roleHasMemberAssignments(role)) {
      return `Cannot deactivate ${role.name}: assigned to ${role.memberCount} member(s).`;
    }
    return `Deactivate ${role.name}`;
  }
  return `Activate ${role.name}`;
}

export function roleDeleteLabel(role: OrgRoleListItem): string {
  if (roleHasMemberAssignments(role) || roleHasPendingInvitations(role)) {
    const parts: string[] = [];
    if (role.memberCount > 0) {
      parts.push(
        role.memberCount === 1
          ? '1 member assignment'
          : `${role.memberCount} member assignments`,
      );
    }
    if (role.pendingInvitationCount > 0) {
      parts.push(
        role.pendingInvitationCount === 1
          ? '1 pending invitation'
          : `${role.pendingInvitationCount} pending invitations`,
      );
    }
    return `Cannot delete ${role.name}: ${parts.join(' and ')}.`;
  }
  return `Permanently delete ${role.name}`;
}

export function describeRoleDeletionBlock(
  impact: {
    readonly totalMemberAssignments: number;
    readonly activeMemberAssignments: number;
    readonly employeeLinkedAssignments: number;
    readonly pendingInvitationAssignments: number;
  },
  roleName: string,
): string {
  if (impact.totalMemberAssignments === 0 && impact.pendingInvitationAssignments === 0) {
    return '';
  }
  const parts: string[] = [];
  if (impact.totalMemberAssignments > 0) {
    parts.push(
      impact.totalMemberAssignments === 1
        ? '1 member assignment'
        : `${impact.totalMemberAssignments} member assignments`,
    );
  }
  if (impact.pendingInvitationAssignments > 0) {
    parts.push(
      impact.pendingInvitationAssignments === 1
        ? '1 pending invitation'
        : `${impact.pendingInvitationAssignments} pending invitations`,
    );
  }
  return `This role cannot be deleted because it has ${parts.join(' and ')}. Remove or reassign uses of “${roleName}” before deleting it.`;
}

export function describeRoleDeactivateBlock(
  role: Pick<OrgRoleListItem, 'name' | 'memberCount'>,
): string {
  if (role.memberCount === 0) return '';
  return role.memberCount === 1
    ? `${role.name} cannot be deactivated because it is assigned to 1 member.`
    : `${role.name} cannot be deactivated because it is assigned to ${role.memberCount} members.`;
}

export type GrantableRoleActor = {
  readonly isPlatformSuperAdmin: boolean;
  readonly permissions: ReadonlySet<PermissionKey>;
};
