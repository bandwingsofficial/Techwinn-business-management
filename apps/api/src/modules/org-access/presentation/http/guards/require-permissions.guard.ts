import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_ERROR_CODES, type PermissionKey } from '#contracts';
import { ApiException } from '../../../../../common/filters/api-error.response.js';
import type { OrgAccessActor } from '../../../application/shared/org-access-actor.js';
import { PermissionCheckerService } from '../../../application/services/permission-checker.service.js';
import type { CrmAuthenticatedRequest } from '../../../../../platform/tenant-context/crm-organization.guard.js';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';
import { REQUIRE_ALL_PERMISSIONS_KEY } from '../decorators/require-all-permissions.decorator.js';

export type OrgAccessAuthenticatedRequest = CrmAuthenticatedRequest & {
  orgAccess?: OrgAccessActor;
};

@Injectable()
export class RequirePermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredAll =
      this.reflector.getAllAndOverride<readonly PermissionKey[] | undefined>(
        REQUIRE_ALL_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];
    const requiredAny =
      this.reflector.getAllAndOverride<readonly PermissionKey[] | undefined>(
        REQUIRE_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (requiredAll.length === 0 && requiredAny.length === 0) return true;

    const request = context.switchToHttp().getRequest<OrgAccessAuthenticatedRequest>();
    const auth = request.platformAuth;
    const crm = request.crm;
    if (!auth || !crm) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        API_ERROR_CODES.UNAUTHENTICATED,
        'Authentication is required.',
      );
    }

    const actor: OrgAccessActor = {
      organizationId: crm.organizationId,
      adminId: crm.adminId,
      isPlatformSuperAdmin: auth.admin.role === 'SUPER_ADMIN',
    };
    request.orgAccess = actor;

    if (requiredAll.length > 0) {
      const allowed = await this.permissions.hasAllPermissions(actor, requiredAll);
      if (!allowed) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          API_ERROR_CODES.FORBIDDEN,
          'You do not have permission to perform this action.',
        );
      }
    }
    if (requiredAny.length > 0) {
      await this.permissions.requirePermissions(actor, requiredAny);
    }
    return true;
  }
}
