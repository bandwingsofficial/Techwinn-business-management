import { Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '#contracts';
import {
  PermissionCheckerService,
  type OrgAccessActor,
} from '../../../org-access/index.js';
import {
  AttendanceEmployeeProfileNotLinkedError,
  AttendanceForbiddenError,
} from '../../domain/errors/attendance.errors.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';

@Injectable()
export class AttendanceAuthorizationService {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendance: AttendanceRepository,
  ) {}

  async resolveEffective(actor: OrgAccessActor): Promise<ReadonlySet<PermissionKey>> {
    const keys = await this.permissions.resolveEffectivePermissions(actor);
    return new Set(keys);
  }

  async assertPermission(actor: OrgAccessActor, key: PermissionKey): Promise<void> {
    const effective = await this.resolveEffective(actor);
    if (actor.isPlatformSuperAdmin || effective.has(key)) return;
    throw new AttendanceForbiddenError();
  }

  async requireEmployeeId(actor: OrgAccessActor): Promise<string> {
    if (actor.isPlatformSuperAdmin) {
      throw new AttendanceEmployeeProfileNotLinkedError(
        'Employee self-service attendance is not available for platform Super Admin accounts. Use Attendance under Human Resources instead.',
      );
    }
    const employeeId = await this.attendance.resolveEmployeeId(actor.organizationId, actor.adminId);
    if (!employeeId) {
      throw new AttendanceEmployeeProfileNotLinkedError();
    }
    return employeeId;
  }
}
