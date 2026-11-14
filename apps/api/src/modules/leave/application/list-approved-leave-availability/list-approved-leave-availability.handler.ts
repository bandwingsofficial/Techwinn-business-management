import { Injectable } from '@nestjs/common';
import type { EmployeeApprovedLeaveAvailabilityResponse } from '#contracts';
import {
  LEAVE_MANAGEMENT_TAB_ALL,
  LEAVE_MANAGEMENT_TAB_APPROVED,
} from '#contracts';
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
    const canReadApprovedLeave =
      (await this.authz.hasLeaveManagementPermission(actor, LEAVE_MANAGEMENT_TAB_APPROVED)) ||
      (await this.authz.hasLeaveManagementPermission(actor, LEAVE_MANAGEMENT_TAB_ALL));
    const canReadForOps = await this.authz.hasPermission(actor, 'tasks.assign');
    const canReadForOpsAlt =
      (await this.authz.hasPermission(actor, 'tasks.create')) ||
      (await this.authz.hasPermission(actor, 'tasks.read')) ||
      (await this.authz.hasPermission(actor, 'attendance.records.view')) ||
      (await this.authz.hasPermission(actor, 'attendance.correct_records'));
    if (!canReadApprovedLeave && !canReadForOps && !canReadForOpsAlt) {
      await this.authz.requireLeaveManagementPermission(actor, LEAVE_MANAGEMENT_TAB_APPROVED);
    }
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
