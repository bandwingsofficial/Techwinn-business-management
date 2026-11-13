import type { MyOrganizationRole, PermissionKey, PlatformAdminProfile } from '@techwin/contracts';
import { resolvePortalSegment } from './portal-segment';

/** Active URL portal segment for the signed-in member (e.g. `admin`, `project-manager`, `quality-analyst`). */
export type PortalKind = string;

export { resolvePortalSegment };

/**
 * Portal segment from assigned organization roles' saved portal URL slugs — never from display names.
 * Navigation and route access still come from effective permissions.
 */
export function resolvePortalKind(
  admin: PlatformAdminProfile,
  _permissions: readonly PermissionKey[],
  roles: readonly MyOrganizationRole[],
): PortalKind {
  return resolvePortalSegment(admin, roles);
}
