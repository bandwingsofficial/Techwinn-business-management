import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '#contracts';
import {
  canViewOrganizationDailyTasks,
  hasEmployeesViewDetailsPermission,
  hasEmployeesViewPermission,
} from '#contracts';
import { employeeLinkedToAdminWhere } from '../../../../lib/persistence/employee-platform-admin-link.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';

/**
 * A stored employee photo may be opened by whoever may already see that employee next to a
 * task: Super Admin, employee-directory viewers and organization daily-task viewers (any photo
 * in their organization), otherwise the employee themself and co-assignees on a shared task.
 */
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
      input.effective.has('employees.read') ||
      canViewOrganizationDailyTasks(input.effective)
    ) {
      return;
    }

    const [viewer, owner] = await Promise.all([
      this.prisma.employee.findFirst({
        where: employeeLinkedToAdminWhere(input.organizationId, input.adminId),
        select: { id: true },
      }),
      this.prisma.employee.findFirst({
        where: {
          organizationId: input.organizationId,
          profileImageStoredObjectId: input.storedObjectId,
        },
        select: { id: true },
      }),
    ]);
    if (!viewer || !owner) throw this.forbidden();
    if (viewer.id === owner.id) return;

    const sharedTasks = await this.prisma.dailyTaskAssignee.count({
      where: {
        organizationId: input.organizationId,
        employeeId: owner.id,
        dailyTask: { assignees: { some: { employeeId: viewer.id } } },
      },
    });
    if (sharedTasks === 0) throw this.forbidden();
  }

  private forbidden(): ForbiddenException {
    return new ForbiddenException(
      'You do not have permission to view this employee profile image.',
    );
  }
}
