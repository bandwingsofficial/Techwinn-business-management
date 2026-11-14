import { Inject, Injectable } from '@nestjs/common';
import { hasAttendancePermission, type AttendanceRecordDetail } from '#contracts';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class GetAttendanceRecordDetailHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, recordId: string): Promise<AttendanceRecordDetail> {
    const detail = await this.repository.getRecordDetail(actor.organizationId, recordId);
    if (actor.isPlatformSuperAdmin) return detail;
    const effective = await this.authz.resolveEffective(actor);
    if (hasAttendancePermission(effective, 'attendance.records.view_details')) {
      await this.authz.assertRecordsDetailAccess(actor);
      return detail;
    }
    await this.authz.assertPunchDetailAccess(actor, detail.employeeId);
    return detail;
  }
}
