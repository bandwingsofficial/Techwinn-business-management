import type { MyOrganizationRole, PlatformAdminProfile } from '@techwin/contracts';
import { primaryOrganizationRole } from '../membership/organization-role-label';

/** Normalizes legacy role keys in URLs (`project_manager` → `project-manager`). */
export function normalizePortalUrlSegment(segment: string): string {
  return segment.trim().toLowerCase().replace(/_/g, '-');
}

/**
 * Trusted portal segment from authenticated membership roles (not display names or URL input).
 * Platform super admins use the admin portal.
 */
export function resolvePortalSegment(
  admin: PlatformAdminProfile,
  roles: readonly MyOrganizationRole[],
): string {
  if (admin.role === 'SUPER_ADMIN') return 'admin';
  const primary = primaryOrganizationRole(roles);
  if (!primary) return 'admin';
  return primary.portalSlug;
}

export function portalDashboardPath(portalSegment: string): string {
  return `/${portalSegment}/dashboard`;
}

export function portalPrefix(portalSegment: string): string {
  return `/${portalSegment}`;
}

export function pathnamePortalSegment(pathname: string): string | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const segment = normalized.split('/').filter(Boolean)[0];
  return segment ?? null;
}

export function pathBelongsToPortalSegment(pathname: string, portalSegment: string): boolean {
  const prefix = portalPrefix(portalSegment);
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return normalized === prefix || normalized.startsWith(`${prefix}/`);
}

/** Rewrites legacy underscore portal prefixes in a pathname to the saved hyphen slug. */
export function rewriteLegacyPortalPrefix(pathname: string, portalSegment: string): string | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const head = parts[0]!;
  if (normalizePortalUrlSegment(head) !== portalSegment) return null;
  if (head === portalSegment) return null;
  parts[0] = portalSegment;
  return `/${parts.join('/')}`;
}

/**
 * Rewrites canonical nav hrefs (`/admin/...`, `/employee/...`) to the active portal prefix.
 */
export function mapHrefToPortalSegment(href: string, portalSegment: string): string {
  const parts = href.split('/').filter(Boolean);
  if (parts.length === 0) return portalDashboardPath(portalSegment);
  parts[0] = portalSegment;
  return `/${parts.join('/')}`;
}

/** Maps unknown portal paths to the canonical `/admin/...` key used in permission tables when needed. */
export function canonicalPermissionPath(pathname: string): string {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 2) return normalized;
  const head = parts[0]!;
  if (head === 'admin' || head === 'employee') {
    return normalized;
  }
  return `/admin/${parts.slice(1).join('/')}`;
}
