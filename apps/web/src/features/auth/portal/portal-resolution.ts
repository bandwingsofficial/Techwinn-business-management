import type {
  MyOrganizationRole,
  MySessionEmployeeSummary,
  PermissionKey,
  PlatformAdminProfile,
} from '@techwin/contracts';
import {
  filterAdminNav,
  type AdminNavGroupWithAccess,
} from '@/features/admin/navigation/filter-admin-nav';
import type { AdminNavLink } from '@/features/admin/navigation/admin-nav-config';
import { membershipAccessContext } from '../membership/membership-access';
import { canAccessAppPath } from '@/shared/navigation/app-route-permissions';
import {
  portalDashboardPath,
  resolvePortalSegment,
} from './portal-segment';
import { resolvePortalKind, type PortalKind } from './portal-policy';

export type { PortalKind };

export { resolvePortalKind, resolvePortalSegment };

function navLinks(groups: readonly AdminNavGroupWithAccess[]): AdminNavLink[] {
  return groups.flatMap((group) =>
    group.items.filter((item): item is AdminNavLink => item.kind === 'link'),
  );
}

/** Post-login landing page for the member's portal segment. */
export function defaultDashboardPath(
  portalSegment: PortalKind,
  permissions: readonly PermissionKey[],
  input: {
    readonly admin: PlatformAdminProfile;
    readonly roles: readonly MyOrganizationRole[];
    readonly sessionEmployee?: MySessionEmployeeSummary | null;
  },
): string {
  const access = membershipAccessContext(
    input.admin,
    input.roles,
    input.sessionEmployee ?? null,
  );
  const permissionSet = new Set(permissions);
  const dashboard = portalDashboardPath(portalSegment);

  if (canAccessAppPath(dashboard, permissionSet, access, portalSegment)) {
    return dashboard;
  }

  const links = navLinks(filterAdminNav(permissions, access, portalSegment));
  const firstModule = links.find((item) => !item.href.endsWith('/dashboard'));
  if (firstModule) return firstModule.href;

  if (links.length > 0) return links[0]!.href;

  return dashboard;
}

export function sanitizeReturnPath(
  value: string | null | undefined,
  portalSegment: PortalKind,
  permissions: ReadonlySet<PermissionKey>,
  access: ReturnType<typeof membershipAccessContext>,
): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  if (path.startsWith('/login') || path.includes('/admin/login')) return null;

  return canAccessAppPath(path, permissions, access, portalSegment) ? path : null;
}

export function resolvePostAuthRedirect(input: {
  readonly admin: PlatformAdminProfile;
  readonly permissions: readonly PermissionKey[];
  readonly roles: readonly MyOrganizationRole[];
  readonly sessionEmployee?: MySessionEmployeeSummary | null;
  readonly returnTo?: string | null;
}): string {
  const portalSegment = resolvePortalSegment(input.admin, input.roles);
  const permissionSet = new Set(input.permissions);
  const access = membershipAccessContext(
    input.admin,
    input.roles,
    input.sessionEmployee ?? null,
  );
  const safeReturn = sanitizeReturnPath(input.returnTo, portalSegment, permissionSet, access);
  return safeReturn ?? defaultDashboardPath(portalSegment, input.permissions, input);
}
