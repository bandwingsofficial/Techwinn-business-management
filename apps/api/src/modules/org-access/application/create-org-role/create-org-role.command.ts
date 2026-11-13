import type { PermissionKey } from '../../domain/types/org-access.types.js';

export type CreateOrgRoleCommand = {
  readonly organizationId: string;
  readonly actorAdminId: string;
  readonly portalSlug: string;
  readonly name: string;
  readonly description: string;
  readonly permissionKeys: readonly PermissionKey[];
};
