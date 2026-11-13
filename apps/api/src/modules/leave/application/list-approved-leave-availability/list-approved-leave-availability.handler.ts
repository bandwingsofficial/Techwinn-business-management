import { Injectable } from '@nestjs/common';
import type { EmployeeApprovedLeaveAvailabilityResponse } from '#contracts';
import type { OrgAccessActor } from '../../../org-access/index.js';
import { LeaveAuthorizationService } from '../services/leave-authorization.service.js';
import { ApprovedLeaveAvailabilityService } from '../services/approved-leave-availability.service.js';

@Injectable()
export class ListApprovedLeaveAvailabilityHandler {
  constructor(
    private readonly authz: LeaveAuthorizationService,
    private readonly availability: ApprovedLeaveAvailabilityService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    dateKey: string,
    employeeIds?: readonly string[],
  ): Promise<EmployeeApprovedLeaveAvailabilityResponse> {
    await this.authz.requireAnyPermission(actor, [
      'leave.requests.read_all',
      'tasks.assign',
      'tasks.create',
      'tasks.read',
      'attendance.view_all',
      'attendance.correct_records',
    ]);
    const items = await this.availability.listAvailabilityForDate(
      actor.organizationId,
      dateKey,
      employeeIds,
    );
    return {
      date: dateKey,
      items: items.map((item) => ({
        employeeId: item.employeeId,
        employeeDisplayName: item.employeeDisplayName,
        date: item.dateKey,
        coverage: item.coverage as 'full' | 'half',
        leaveTypeName: item.leaveTypeName,
        halfDaySession: item.halfDaySession,
        startDate: item.startDate,
        endDate: item.endDate,
        leaveRequestId: item.leaveRequestId,
      })),
    };
  }
}
