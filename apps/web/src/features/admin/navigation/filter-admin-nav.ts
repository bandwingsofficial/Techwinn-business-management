import { isSuperAdminPortalSlug, type PermissionKey } from '@techwin/contracts';
import {
  canUseEmployeeSelfService,
  type MembershipAccessContext,
} from '@/features/auth/membership/membership-access';
import { adminFeaturePathToPortal } from '@/features/auth/portal/portal-paths';
import { portalDashboardPath } from '@/features/auth/portal/portal-segment';
import { canAccessAppPath } from '@/shared/navigation/app-route-permissions';
import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_HREF_OWNERS,
  type AdminNavGroup,
  type AdminNavLink,
  type AdminNavItem,
} from './admin-nav-config';
import { canAccessNavItem, isDashboardNavConfigHref } from './nav-item-access';
import { shouldShowNavHref } from './navigation-route-policy';

const ATTENDANCE_PUNCH_NAV_CONFIG_HREF = '/admin/attendance/punch';

/** Super Admin manages org attendance records; punch self-service is not in their sidebar. */
function shouldShowAttendancePunchNavItem(configHref: string, portalSegment: string): boolean {
  if (configHref !== ATTENDANCE_PUNCH_NAV_CONFIG_HREF) return true;
  return !isSuperAdminPortalSlug(portalSegment);
}

function resolvePortalNavHref(configHref: string, portalSegment: string): string {
  return adminFeaturePathToPortal(configHref, portalSegment);
}

export type AdminNavGroupWithAccess = AdminNavGroup;

export function filterAdminNav(
  permissions: readonly PermissionKey[],
  access?: MembershipAccessContext,
  portalSegment = 'admin',
): readonly AdminNavGroupWithAccess[] {
  const granted = new Set(permissions);
  // Workspace dashboard is membership-gated; other nav items require explicit view/read keys.
  if (granted.size === 0) return [];

  const groups: AdminNavGroupWithAccess[] = [];
  let dashboardAdded = false;
  const renderedConfigHrefs = new Set<string>();

  for (const group of ADMIN_NAV_GROUPS) {
    if (group.id === 'my-workspace' && (!access || !canUseEmployeeSelfService(access))) {
      continue;
    }

    const items: AdminNavItem[] = [];

    for (const item of group.items) {
      if (item.kind === 'soon') continue;
      if (item.kind !== 'link') continue;

      if (isDashboardNavConfigHref(item.href)) {
        if (dashboardAdded) continue;
        const dashboardHref = portalDashboardPath(portalSegment);
        if (!canAccessAppPath(dashboardHref, granted, access, portalSegment)) {
          continue;
        }
        const dashboardLink: AdminNavLink = {
          kind: 'link',
          href: dashboardHref,
          label: 'Dashboard',
          icon: item.icon,
        };
        items.push(dashboardLink);
        dashboardAdded = true;
        continue;
      }

      if (!shouldShowAttendancePunchNavItem(item.href, portalSegment)) continue;
      if (!shouldShowNavHref(item.href, granted, access)) continue;
      if (!canAccessNavItem(item.href, granted, access)) continue;

      const ownerGroup = ADMIN_NAV_HREF_OWNERS.get(item.href);
      if (ownerGroup && ownerGroup !== group.id) continue;
      if (renderedConfigHrefs.has(item.href)) continue;

      const href = resolvePortalNavHref(item.href, portalSegment);
      const seen = items.some((entry) => entry.kind === 'link' && entry.href === href);
      if (seen) continue;

      items.push({ ...item, href });
      renderedConfigHrefs.add(item.href);
    }

    if (items.length > 0) {
      groups.push({ ...group, items });
    }
  }

  return groups;
}
