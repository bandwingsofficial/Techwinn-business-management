import { Inject, Injectable } from '@nestjs/common';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../../attendance/domain/repositories/attendance.repository.js';

/**
 * After leave approve/cancel, refresh attendance derivation for affected dates
 * without inventing duplicate attendance rows beyond existing reconciliation.
 */
@Injectable()
export class LeaveAttendanceSyncService {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendance: AttendanceRepository,
  ) {}

  async reconcileDates(organizationId: string, dateKeys: readonly string[]): Promise<void> {
    const unique = [...new Set(dateKeys.filter(Boolean))].sort();
    const now = new Date();
    for (const dateKey of unique) {
      await this.attendance.reconcileOrganizationDate(organizationId, dateKey, now);
    }
  }
}
