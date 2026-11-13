import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  classifyApprovedLeaveForDate,
  resolveApprovedLeaveCoverageDetail,
  type ApprovedLeaveCoverage,
  type ApprovedLeaveCoverageDetail,
  type ApprovedLeaveDayInput,
  type ApprovedLeaveHalfDaySession,
} from '../../domain/policies/approved-leave-coverage.policy.js';
import { EmployeeOnApprovedLeaveError } from '../../domain/errors/leave.errors.js';

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateKeyFromDb(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export type EmployeeApprovedLeaveAvailability = ApprovedLeaveCoverageDetail & {
  readonly employeeId: string;
  readonly employeeDisplayName: string | null;
};

@Injectable()
export class ApprovedLeaveAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async listApprovedLeaveDaysForEmployees(
    organizationId: string,
    employeeIds: readonly string[],
    fromDateKey: string,
    toDateKey: string,
  ): Promise<Map<string, ApprovedLeaveDayInput[]>> {
    const result = new Map<string, ApprovedLeaveDayInput[]>();
    if (employeeIds.length === 0) return result;

    const from = parseDateOnly(fromDateKey);
    const to = parseDateOnly(toDateKey);
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        organizationId,
        employeeId: { in: [...employeeIds] },
        status: 'APPROVED',
        startDate: { lte: to },
        endDate: { gte: from },
      },
      select: {
        id: true,
        employeeId: true,
        isHalfDay: true,
        halfDayDate: true,
        halfDaySession: true,
        startDate: true,
        endDate: true,
        leaveType: { select: { name: true } },
        selectedDates: { select: { leaveDate: true } },
      },
    });

    for (const row of rows) {
      const day: ApprovedLeaveDayInput = {
        isHalfDay: row.isHalfDay,
        halfDayDate: row.halfDayDate ? dateKeyFromDb(row.halfDayDate) : null,
        halfDaySession: (row.halfDaySession as ApprovedLeaveHalfDaySession | null) ?? null,
        selectedDates: row.selectedDates.map((entry) => dateKeyFromDb(entry.leaveDate)),
        leaveTypeName: row.leaveType.name,
        leaveRequestId: row.id,
        startDate: dateKeyFromDb(row.startDate),
        endDate: dateKeyFromDb(row.endDate),
      };
      const list = result.get(row.employeeId) ?? [];
      list.push(day);
      result.set(row.employeeId, list);
    }
    return result;
  }

  async getCoverageForEmployeeDate(
    organizationId: string,
    employeeId: string,
    dateKey: string,
  ): Promise<ApprovedLeaveCoverageDetail> {
    const byEmployee = await this.listApprovedLeaveDaysForEmployees(
      organizationId,
      [employeeId],
      dateKey,
      dateKey,
    );
    return resolveApprovedLeaveCoverageDetail(byEmployee.get(employeeId) ?? [], dateKey);
  }

  async getCoverageMapForEmployeesDate(
    organizationId: string,
    employeeIds: readonly string[],
    dateKey: string,
  ): Promise<Map<string, ApprovedLeaveCoverageDetail>> {
    const byEmployee = await this.listApprovedLeaveDaysForEmployees(
      organizationId,
      employeeIds,
      dateKey,
      dateKey,
    );
    const map = new Map<string, ApprovedLeaveCoverageDetail>();
    for (const employeeId of employeeIds) {
      map.set(
        employeeId,
        resolveApprovedLeaveCoverageDetail(byEmployee.get(employeeId) ?? [], dateKey),
      );
    }
    return map;
  }

  classify(requests: readonly ApprovedLeaveDayInput[], dateKey: string): ApprovedLeaveCoverage {
    return classifyApprovedLeaveForDate(requests, dateKey);
  }

  async listAvailabilityForDate(
    organizationId: string,
    dateKey: string,
    employeeIds?: readonly string[],
  ): Promise<readonly EmployeeApprovedLeaveAvailability[]> {
    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        ...(employeeIds && employeeIds.length > 0 ? { id: { in: [...employeeIds] } } : {}),
        employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
        deactivatedAt: null,
      },
      select: { id: true, displayName: true },
    });
    if (employees.length === 0) return [];

    const coverage = await this.getCoverageMapForEmployeesDate(
      organizationId,
      employees.map((row) => row.id),
      dateKey,
    );

    return employees
      .map((employee) => {
        const detail = coverage.get(employee.id)!;
        return {
          employeeId: employee.id,
          employeeDisplayName: employee.displayName,
          ...detail,
        };
      })
      .filter((row) => row.coverage !== 'none');
  }

  /**
   * Blocks new full-day assignment when the employee has approved full-day leave.
   * Half-day leave does not block task assignment for the date.
   */
  async assertEmployeesAssignableOnDate(
    organizationId: string,
    employeeIds: readonly string[],
    assignDateKey: string,
  ): Promise<void> {
    if (employeeIds.length === 0) return;
    const coverage = await this.getCoverageMapForEmployeesDate(
      organizationId,
      employeeIds,
      assignDateKey,
    );
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, id: { in: [...employeeIds] } },
      select: { id: true, displayName: true },
    });
    const nameById = new Map(employees.map((row) => [row.id, row.displayName]));

    for (const employeeId of employeeIds) {
      const detail = coverage.get(employeeId);
      if (!detail || detail.coverage !== 'full') continue;
      throw new EmployeeOnApprovedLeaveError({
        employeeId,
        employeeDisplayName: nameById.get(employeeId) ?? null,
        date: assignDateKey,
        leaveTypeName: detail.leaveTypeName,
        startDate: detail.startDate,
        endDate: detail.endDate,
        coverage: detail.coverage,
        halfDaySession: detail.halfDaySession,
      });
    }
  }

  async assertAttendanceActionAllowed(
    organizationId: string,
    employeeId: string,
    dateKey: string,
    options: { readonly action: 'punch' | 'manual_present' | 'manual_absent' | 'manual_override' },
  ): Promise<ApprovedLeaveCoverageDetail> {
    const detail = await this.getCoverageForEmployeeDate(organizationId, employeeId, dateKey);
    if (detail.coverage === 'none') return detail;

    if (detail.coverage === 'full') {
      const employee = await this.prisma.employee.findFirst({
        where: { id: employeeId, organizationId },
        select: { displayName: true },
      });
      throw new EmployeeOnApprovedLeaveError({
        employeeId,
        employeeDisplayName: employee?.displayName ?? null,
        date: dateKey,
        leaveTypeName: detail.leaveTypeName,
        startDate: detail.startDate,
        endDate: detail.endDate,
        coverage: detail.coverage,
        halfDaySession: detail.halfDaySession,
        action: options.action,
      });
    }

    // Half-day: punches and the working session remain allowed.
    return detail;
  }
}
