import { isSuperAdminPortalSlug, SYSTEM_ROLE_KEYS } from '@techwin/contracts';
import { adminFeaturePathToPortal } from './portal-paths';
import {
  canonicalPermissionPath,
  mapHrefToPortalSegment,
  pathBelongsToPortalSegment,
  pathnamePortalSegment,
  portalDashboardPath,
  rewriteLegacyPortalPrefix,
} from './portal-segment';

function normalizePathname(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * Rewrites legacy/ canonical workspace URLs to the signed-in member's trusted portal segment.
 *
 * Order: legacy underscore slugs → super-admin canonical `/admin` paths →
 * canonical `/admin` | `/project-manager` | foreign `/employee` org paths →
 * same feature under a different portal slug (preserves path suffix).
 *
 * Does not grant permissions — callers must still run {@link canAccessAppPath}.
 */
export function rewritePathToTrustedPortal(
  pathname: string,
  portalSegment: string,
): string | null {
  const legacy = rewriteLegacyPortalPrefix(pathname, portalSegment);
  if (legacy) return legacy;

  const normalized = normalizePathname(pathname);
  if (pathBelongsToPortalSegment(normalized, portalSegment)) return null;

  const head = pathnamePortalSegment(normalized);
  if (!head) return null;

  if (
    portalSegment !== SYSTEM_ROLE_KEYS.superAdmin &&
    (head === SYSTEM_ROLE_KEYS.superAdmin || isSuperAdminPortalSlug(head))
  ) {
    return null;
  }

  if (portalSegment === SYSTEM_ROLE_KEYS.superAdmin) {
    if (head === SYSTEM_ROLE_KEYS.admin || isSuperAdminPortalSlug(head)) {
      return mapHrefToPortalSegment(normalized, portalSegment);
    }
    return null;
  }

  if (
    head === SYSTEM_ROLE_KEYS.admin ||
    head === SYSTEM_ROLE_KEYS.projectManager ||
    head === SYSTEM_ROLE_KEYS.employee
  ) {
    const canonical = canonicalPermissionPath(normalized);
    const mapped = adminFeaturePathToPortal(canonical, portalSegment);
    if (mapped !== normalized) return mapped;
  }

  const parts = normalized.split('/').filter(Boolean);
  if (parts.length >= 2 && head !== portalSegment) {
    parts[0] = portalSegment;
    const rewritten = `/${parts.join('/')}`;
    return rewritten === normalized ? null : rewritten;
  }

  if (parts.length === 1 && head !== portalSegment) {
    return portalDashboardPath(portalSegment);
  }

  return null;
}
