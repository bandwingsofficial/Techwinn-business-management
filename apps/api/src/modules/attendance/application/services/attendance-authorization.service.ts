import { Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '#contracts';
import {
  ATTENDANCE_PUNCH_PAGE_VIEW,
  ATTENDANCE_PUNCH_VIEW_ALL,
  ATTENDANCE_PUNCH_VIEW_DETAILS,
  ATTENDANCE_RECORDS_EDIT,
  ATTENDANCE_RECORDS_PAGE_VIEW,
  ATTENDANCE_RECORDS_VIEW_DETAILS,
  hasAttendancePermission,
} from '#contracts';
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

  private async effective(actor: OrgAccessActor): Promise<ReadonlySet<PermissionKey>> {
    return this.resolveEffective(actor);
  }

  async assertPermission(actor: OrgAccessActor, key: PermissionKey): Promise<void> {
    const effective = await this.effective(actor);
    if (actor.isPlatformSuperAdmin || hasAttendancePermission(effective, key)) return;
    throw new AttendanceForbiddenError();
  }

  async assertAnyPermission(actor: OrgAccessActor, keys: readonly PermissionKey[]): Promise<void> {
    const effective = await this.effective(actor);
    if (actor.isPlatformSuperAdmin) return;
    if (keys.some((key) => hasAttendancePermission(effective, key))) return;
    throw new AttendanceForbiddenError();
  }

  /** Org attendance records table (records page only). */
  async assertRecordsListAccess(actor: OrgAccessActor): Promise<void> {
    await this.assertPermission(actor, ATTENDANCE_RECORDS_PAGE_VIEW);
  }

  /** Org punch history on punch page (`punch.view_all`); never `records.view`. */
  async assertOrgPunchHistoryListAccess(actor: OrgAccessActor): Promise<void> {
    await this.assertPermission(actor, ATTENDANCE_PUNCH_VIEW_ALL);
  }

  async assertPunchPageAccess(actor: OrgAccessActor): Promise<void> {
    await this.assertPermission(actor, ATTENDANCE_PUNCH_PAGE_VIEW);
  }

  async assertRecordsDetailAccess(actor: OrgAccessActor): Promise<void> {
    await this.assertPermission(actor, ATTENDANCE_RECORDS_VIEW_DETAILS);
  }

  async assertPunchDetailAccess(actor: OrgAccessActor, recordEmployeeId: string): Promise<void> {
    const effective = await this.effective(actor);
    if (actor.isPlatformSuperAdmin) return;
    if (!hasAttendancePermission(effective, ATTENDANCE_PUNCH_VIEW_DETAILS)) {
      throw new AttendanceForbiddenError();
    }
    if (hasAttendancePermission(effective, ATTENDANCE_PUNCH_VIEW_ALL)) {
      return;
    }
    const ownEmployeeId = await this.attendance.resolveEmployeeId(
      actor.organizationId,
      actor.adminId,
    );
    if (ownEmployeeId && ownEmployeeId === recordEmployeeId) return;
    throw new AttendanceForbiddenError();
  }

  async assertCanEditRecord(actor: OrgAccessActor): Promise<void> {
    await this.assertAnyPermission(actor, [
      ATTENDANCE_RECORDS_EDIT,
      'attendance.correct_records',
    ]);
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