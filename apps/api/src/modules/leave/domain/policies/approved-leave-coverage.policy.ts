export type ApprovedLeaveCoverage = 'none' | 'full' | 'half';

export type ApprovedLeaveHalfDaySession = 'FIRST_HALF' | 'SECOND_HALF';

export type ApprovedLeaveDayInput = {
  readonly isHalfDay: boolean;
  readonly halfDayDate: string | null;
  readonly halfDaySession: ApprovedLeaveHalfDaySession | null;
  readonly selectedDates: readonly string[];
  readonly leaveTypeName?: string | null;
  readonly leaveRequestId?: string;
  readonly startDate?: string;
  readonly endDate?: string;
};

export type ApprovedLeaveCoverageDetail = {
  readonly coverage: ApprovedLeaveCoverage;
  readonly leaveRequestId: string | null;
  readonly leaveTypeName: string | null;
  readonly halfDaySession: ApprovedLeaveHalfDaySession | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly dateKey: string;
};

/** Approved leave covering one calendar date. Full-day leave wins over a half-day request. */
export function classifyApprovedLeaveForDate(
  requests: readonly ApprovedLeaveDayInput[],
  dateKey: string,
): ApprovedLeaveCoverage {
  let sawHalf = false;
  for (const request of requests) {
    if (request.selectedDates.length > 0 && !request.selectedDates.includes(dateKey)) continue;
    const halfOnThisDate =
      request.isHalfDay &&
      (request.halfDayDate === dateKey ||
        (request.halfDayDate == null && request.selectedDates.length <= 1));
    if (halfOnThisDate) {
      sawHalf = true;
      continue;
    }
    return 'full';
  }
  return sawHalf ? 'half' : 'none';
}

export function resolveApprovedLeaveCoverageDetail(
  requests: readonly ApprovedLeaveDayInput[],
  dateKey: string,
): ApprovedLeaveCoverageDetail {
  let halfMatch: ApprovedLeaveDayInput | null = null;
  for (const request of requests) {
    if (request.selectedDates.length > 0 && !request.selectedDates.includes(dateKey)) continue;
    const halfOnThisDate =
      request.isHalfDay &&
      (request.halfDayDate === dateKey ||
        (request.halfDayDate == null && request.selectedDates.length <= 1));
    if (halfOnThisDate) {
      halfMatch ??= request;
      continue;
    }
    return {
      coverage: 'full',
      leaveRequestId: request.leaveRequestId ?? null,
      leaveTypeName: request.leaveTypeName ?? null,
      halfDaySession: null,
      startDate: request.startDate ?? null,
      endDate: request.endDate ?? null,
      dateKey,
    };
  }
  if (halfMatch) {
    return {
      coverage: 'half',
      leaveRequestId: halfMatch.leaveRequestId ?? null,
      leaveTypeName: halfMatch.leaveTypeName ?? null,
      halfDaySession: halfMatch.halfDaySession,
      startDate: halfMatch.startDate ?? null,
      endDate: halfMatch.endDate ?? null,
      dateKey,
    };
  }
  return {
    coverage: 'none',
    leaveRequestId: null,
    leaveTypeName: null,
    halfDaySession: null,
    startDate: null,
    endDate: null,
    dateKey,
  };
}

/** Full-day approved leave blocks new task assignment for that date. Half-day does not. */
export function isFullDayApprovedLeaveBlockingAssignment(
  coverage: ApprovedLeaveCoverage,
): boolean {
  return coverage === 'full';
}
