import { Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '#contracts';
import {
  resolveGlobalSearchCategories,
  resolveGlobalSearchScope,
} from '#contracts';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { employeeLinkedToAdminWhere } from '../../../../lib/persistence/employee-platform-admin-link.js';
import type { OrgAccessActor } from '../../../org-access/application/shared/org-access-actor.js';
import { PermissionCheckerService } from '../../../org-access/application/services/permission-checker.service.js';
import type { GlobalSearchExecutionContext } from '../../domain/global-search.types.js';

@Injectable()
export class GlobalSearchContextService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
  ) {}

  async build(actor: OrgAccessActor): Promise<GlobalSearchExecutionContext> {
    const keys = await this.permissions.resolveEffectivePermissions(actor);
    const permissions = new Set(keys) as ReadonlySet<PermissionKey>;
    const sessionEmployeeId = await this.resolveSessionEmployeeId(actor);
    const scope = resolveGlobalSearchScope(permissions, actor.isPlatformSuperAdmin, sessionEmployeeId);
    const allowedCategories = resolveGlobalSearchCategories(
      permissions,
      actor.isPlatformSuperAdmin,
      sessionEmployeeId,
    );
    return { actor, permissions, sessionEmployeeId, scope, allowedCategories };
  }

  private async resolveSessionEmployeeId(actor: OrgAccessActor): Promise<string | null> {
    if (actor.isPlatformSuperAdmin) {
      const linked = await this.prisma.employee.findFirst({
        where: employeeLinkedToAdminWhere(actor.organizationId, actor.adminId),
        select: { id: true },
      });
      return linked?.id ?? null;
    }
    const row = await this.prisma.employee.findFirst({
      where: employeeLinkedToAdminWhere(actor.organizationId, actor.adminId),
      select: { id: true },
    });
    return row?.id ?? null;
  }
}