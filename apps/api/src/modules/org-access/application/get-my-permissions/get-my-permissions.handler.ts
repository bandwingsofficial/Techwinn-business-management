import { Inject, Injectable } from '@nestjs/common';
import {
  EMPLOYEE_ROUTES,
  hasUnrestrictedOrgPermissions,
  SYSTEM_ROLE_KEYS,
} from '#contracts';
import type {
  MyOrganizationRole,
  MySessionEmployeeSummary,
  PermissionKey,
} from '#contracts';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import { PermissionCheckerService } from '../services/permission-checker.service.js';
import type { GetMyPermissionsQuery } from './get-my-permissions.query.js';

export type MyAccessSnapshot = {
  readonly permissions: readonly PermissionKey[];
  readonly roles: readonly MyOrganizationRole[];
  readonly sessionEmployee: MySessionEmployeeSummary | null;
  readonly revision: string;
  readonly fullAccess: boolean;
};

@Injectable()
export class GetMyPermissionsHandler {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissionChecker: PermissionCheckerService,
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(query: GetMyPermissionsQuery): Promise<MyAccessSnapshot> {
    const [permissions, revision] = await Promise.all([
      this.permissionChecker.resolveEffectivePermissions(query.actor),
      this.repository.currentPermissionRevision(query.actor.organizationId),
    ]);
    const sessionEmployee = await this.resolveSessionEmployee(
      query.actor.organizationId,
      query.actor.adminId,
    );
    const fullAccess =
      query.actor.isPlatformSuperAdmin || hasUnrestrictedOrgPermissions(permissions);
    if (query.actor.isPlatformSuperAdmin) {
      return {
        permissions,
        sessionEmployee,
        revision,
        fullAccess: true,
        roles: [
          {
            id: SYSTEM_ROLE_KEYS.superAdmin,
            portalSlug: SYSTEM_ROLE_KEYS.superAdmin,
            name: 'Super Admin',
          },
        ],
      };
    }
    const roles = await this.repository.resolveActiveMembershipRoles(
      query.actor.organizationId,
      query.actor.adminId,
    );
    return { permissions, roles: [...roles], sessionEmployee, revision, fullAccess };
  }

  private async resolveSessionEmployee(
    organizationId: string,
    adminId: string,
  ): Promise<MySessionEmployeeSummary | null> {
    const row = await this.prisma.employee.findFirst({
      where: {
        organizationId,
        platformAdminId: adminId,
        employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
        deactivatedAt: null,
      },
      select: {
        id: true,
        displayName: true,
        jobTitle: true,
        profileImageUrl: true,
        profileImageStoredObjectId: true,
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      displayName: row.displayName,
      jobTitle: row.jobTitle,
      profileImageUrl: row.profileImageStoredObjectId
        ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(row.profileImageStoredObjectId)
        : row.profileImageUrl,
    };
  }
}
