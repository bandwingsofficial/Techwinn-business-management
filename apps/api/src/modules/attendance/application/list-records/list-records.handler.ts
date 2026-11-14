import { Inject, Injectable } from '@nestjs/common';
import {
  ATTENDANCE_PUNCH_VIEW_ALL,
  ATTENDANCE_RECORDS_PAGE_VIEW,
  hasAttendancePermission,
} from '#contracts';
import type { AttendanceListResponse } from '#contracts';
import type { AttendanceListQuery } from '#validation';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { ReconcileDailyAttendanceHandler } from '../reconcile-daily-attendance/reconcile-daily-attendance.handler.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';
import { AttendanceForbiddenError } from '../../domain/errors/attendance.errors.js';

@Injectable()
export class ListAttendanceRecordsHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
    @Inject(ReconcileDailyAttendanceHandler) private readonly reconcile: ReconcileDailyAttendanceHandler,
  ) {}

  async execute(actor: OrgAccessActor, query: AttendanceListQuery): Promise<AttendanceListResponse> {
    const effective = await this.authz.resolveEffective(actor);
    const canRecords = hasAttendancePermission(effective, ATTENDANCE_RECORDS_PAGE_VIEW);
    const canOrgPunch = hasAttendancePermission(effective, ATTENDANCE_PUNCH_VIEW_ALL);
    if (!actor.isPlatformSuperAdmin && !canRecords && !canOrgPunch) {
      throw new AttendanceForbiddenError();
    }
    if (!canRecords && canOrgPunch) {
      await this.authz.assertOrgPunchHistoryListAccess(actor);
    } else if (canRecords) {
      await this.authz.assertRecordsListAccess(actor);
    }

    if (query.date) {
      await this.reconcile.execute(actor.organizationId, query.date);
    }
    return this.repository.listRecords(actor.organizationId, query);
  }
}