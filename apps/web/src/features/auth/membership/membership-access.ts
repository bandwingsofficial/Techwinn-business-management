import {
  isSuperAdminPortalSlug,
  LEGACY_SUPER_ADMIN_PORTAL_SLUG,
  SYSTEM_ROLE_KEYS,
  type MyOrganizationRole,
  type MySessionEmployeeSummary,
  type PermissionKey,
  type PlatformAdminProfile,
  type PlatformAdminRole,
} from '@techwin/contracts';
import { hasOrganizationWorkspacePermissionSignals } from '@/features/admin/navigation/navigation-route-policy';
import {
  formatOrganizationRoleLabel,
  formatPrimaryOrganizationRoleLabel,
} from './organization-role-label';

export type MembershipAccessContext = {
  readonly platformRole: PlatformAdminRole;
  readonly membershipRoles: readonly MyOrganizationRole[];
  /** Linked HR employee for this org session; required for employee self-service. */
  readonly sessionEmployee: MySessionEmployeeSummary | null;
};

const WORKSPACE_OVERVIEW_ROLE_KEYS: ReadonlySet<string> = new Set([
  SYSTEM_ROLE_KEYS.superAdmin,
  LEGACY_SUPER_ADMIN_PORTAL_SLUG,
]);

/** Super Admin platform role or organization Super Admin portal membership. */
export function hasWorkspaceDashboardMembershipAccess(context: MembershipAccessContext): boolean {
  if (context.platformRole === 'SUPER_ADMIN') return true;
  return context.membershipRoles.some(
    (role) =>
      WORKSPACE_OVERVIEW_ROLE_KEYS.has(role.portalSlug) || isSuperAdminPortalSlug(role.portalSlug),
  );
}

export function canAccessWorkspaceDashboard(
  context: MembershipAccessContext,
  permissions?: ReadonlySet<PermissionKey>,
): boolean {
  if (hasWorkspaceDashboardMembershipAccess(context)) return true;
  if (permissions && permissions.size > 0) {
    return hasOrganizationWorkspacePermissionSignals(permissions, context);
  }
  return false;
}

/**
 * Employee self-service (`/employee/*` My Workspace) is for members with a linked
 * employee profile. Platform Super Admins never use self-service — they use admin HR modules.
 */
export function canUseEmployeeSelfService(context: MembershipAccessContext): boolean {
  if (context.platformRole === 'SUPER_ADMIN') return false;
  return context.sessionEmployee !== null;
}

/**
 * Header / compact identity label from organization membership roles only.
 * Never invents Admin, Member, or Employee when the API returns no roles.
 */
export function formatMembershipRoleLabel(
  admin: PlatformAdminProfile,
  roles: readonly MyOrganizationRole[],
): string {
  if (roles.length > 0) {
    return formatPrimaryOrganizationRoleLabel(roles);
  }
  if (admin.role === 'SUPER_ADMIN') return 'Super Admin';
  return '';
}

/** Full membership role list for profile/dashboard details. */
export function formatMembershipRoleDetails(
  admin: PlatformAdminProfile,
  roles: readonly MyOrganizationRole[],
): string {
  if (roles.length > 0) {
    return formatOrganizationRoleLabel(roles);
  }
  if (admin.role === 'SUPER_ADMIN') return 'Super Admin';
  return 'No organization role assigned';
}

export function membershipAccessContext(
  admin: PlatformAdminProfile,
  roles: readonly MyOrganizationRole[],
  sessionEmployee: MySessionEmployeeSummary | null = null,
): MembershipAccessContext {
  return { platformRole: admin.role, membershipRoles: roles, sessionEmployee };
}
