import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '#contracts';
import {
  hasEmployeesViewDetailsPermission,
  hasEmployeesViewPermission,
} from '#contracts';
import { employeeLinkedToAdminWhere } from '../../../../lib/persistence/employee-platform-admin-link.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
@Injectable()
export class EmployeeProfileImageAccessService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async assertCanOpenStoredProfileImage(input: {
    readonly organizationId: string;
    readonly adminId: string;
    readonly isPlatformSuperAdmin: boolean;
    readonly effective: ReadonlySet<PermissionKey>;
    readonly storedObjectId: string;
  }): Promise<void> {
    if (input.isPlatformSuperAdmin) return;
    if (
      hasEmployeesViewPermission(input.effective) ||
      hasEmployeesViewDetailsPermission(input.effective) ||
      input.effective.has('employees.read')
    ) {
      return;
    }

    const own = await this.prisma.employee.findFirst({
      where: employeeLinkedToAdminWhere(input.organizationId, input.adminId),
      select: { profileImageStoredObjectId: true },
    });
    if (!own?.profileImageStoredObjectId || own.profileImageStoredObjectId !== input.storedObjectId) {
      throw new ForbiddenException('You do not have permission to view this employee profile image.');
    }
  }

  async assertCanOpenLegacyProfileImage(input: {
    readonly organizationId: string;
    readonly adminId: string;
    readonly isPlatformSuperAdmin: boolean;
    readonly effective: ReadonlySet<PermissionKey>;
    readonly employeeIdForImage: string;
  }): Promise<void> {
    if (input.isPlatformSuperAdmin) return;
    if (
      hasEmployeesViewPermission(input.effective) ||
      hasEmployeesViewDetailsPermission(input.effective) ||
      input.effective.has('employees.read')
    ) {
      return;
    }

    const own = await this.prisma.employee.findFirst({
      where: employeeLinkedToAdminWhere(input.organizationId, input.adminId),
      select: { id: true },
    });
    if (!own || own.id !== input.employeeIdForImage) {
      throw new ForbiddenException('You do not have permission to view this employee profile image.');
    }
  }
}