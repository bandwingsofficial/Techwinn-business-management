import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '#contracts';

export const REQUIRE_ALL_PERMISSIONS_KEY = 'org_access_required_all_permissions';

/** Actor must hold every listed permission (AND). */
export const RequireAllPermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(REQUIRE_ALL_PERMISSIONS_KEY, permissions);
