export class LeaveError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'LeaveError';
  }
}

export class LeaveNotFoundError extends LeaveError {
  constructor(entity = 'Leave record') {
    super(`${entity} was not found.`, 'LEAVE_NOT_FOUND');
    this.name = 'LeaveNotFoundError';
  }
}

export class LeaveForbiddenError extends LeaveError {
  constructor(message = 'Leave action is not allowed.') {
    super(message, 'LEAVE_FORBIDDEN');
    this.name = 'LeaveForbiddenError';
  }
}

/** Self-service leave requires an active linked employee profile (not platform Super Admin). */
export class LeaveEmployeeProfileNotLinkedError extends LeaveError {
  constructor(
    message = 'No active employee profile is linked to your account. Ask an administrator to link your user to an employee record before using leave self-service.',
  ) {
    super(message, 'LEAVE_EMPLOYEE_PROFILE_NOT_LINKED');
    this.name = 'LeaveEmployeeProfileNotLinkedError';
  }
}

export class LeaveConflictError extends LeaveError {
  constructor(message: string) {
    super(message, 'LEAVE_CONFLICT');
    this.name = 'LeaveConflictError';
  }
}

export class LeaveValidationError extends LeaveError {
  constructor(message: string) {
    super(message, 'LEAVE_VALIDATION');
    this.name = 'LeaveValidationError';
  }
}

export class LeaveTypeHasDependenciesError extends LeaveError {
  constructor(
    message: string,
    readonly requestCount: number,
    readonly balanceCount: number,
    readonly allocationCount: number,
  ) {
    super(message, 'LEAVE_TYPE_HAS_DEPENDENCIES');
    this.name = 'LeaveTypeHasDependenciesError';
  }
}

export class LeaveBalanceHasDependenciesError extends LeaveError {
  constructor(
    message: string,
    readonly pendingRequestCount: number,
    readonly approvedRequestCount: number,
    readonly consumedBalanceCount: number,
    readonly adjustedBalanceCount: number,
    readonly protectedTransactionCount: number,
  ) {
    super(message, 'LEAVE_BALANCE_HAS_DEPENDENCIES');
    this.name = 'LeaveBalanceHasDependenciesError';
  }
}

export type EmployeeOnApprovedLeaveErrorInput = {
  readonly employeeId: string;
  readonly employeeDisplayName: string | null;
  readonly date: string;
  readonly leaveTypeName: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly coverage: 'full' | 'half';
  readonly halfDaySession: 'FIRST_HALF' | 'SECOND_HALF' | null;
  readonly action?: 'punch' | 'manual_present' | 'manual_absent' | 'manual_override' | 'assign';
};

function buildOnLeaveMessage(input: EmployeeOnApprovedLeaveErrorInput): string {
  const who = input.employeeDisplayName?.trim() || 'This employee';
  const leaveType = input.leaveTypeName?.trim() || 'approved leave';
  const period =
    input.startDate && input.endDate && input.startDate !== input.endDate
      ? `${input.startDate} to ${input.endDate}`
      : input.date;
  if (input.action === 'punch') {
    return `${who} is on ${leaveType} for ${input.date}. Punch in/out is not allowed during approved full-day leave.`;
  }
  if (input.action === 'manual_present') {
    return `${who} is on ${leaveType} for ${input.date}. Present cannot be marked for an approved leave day.`;
  }
  if (input.action === 'manual_absent') {
    return `${who} is on ${leaveType} for ${input.date}. Absent cannot be marked for an approved leave day.`;
  }
  if (input.action === 'manual_override') {
    return `${who} is on ${leaveType} for ${input.date}. Attendance cannot be overridden for approved leave.`;
  }
  if (input.coverage === 'half') {
    return `${who} has approved half-day ${leaveType} on ${input.date}.`;
  }
  return `${who} is on approved leave (${leaveType}) for ${period}. They cannot be assigned tasks on ${input.date}.`;
}

/** Cross-module conflict when an action conflicts with persisted approved leave. */
export class EmployeeOnApprovedLeaveError extends LeaveError {
  readonly employeeId: string;
  readonly employeeDisplayName: string | null;
  readonly date: string;
  readonly leaveTypeName: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly coverage: 'full' | 'half';
  readonly halfDaySession: 'FIRST_HALF' | 'SECOND_HALF' | null;

  constructor(input: EmployeeOnApprovedLeaveErrorInput) {
    super(buildOnLeaveMessage(input), 'EMPLOYEE_ON_APPROVED_LEAVE');
    this.name = 'EmployeeOnApprovedLeaveError';
    this.employeeId = input.employeeId;
    this.employeeDisplayName = input.employeeDisplayName;
    this.date = input.date;
    this.leaveTypeName = input.leaveTypeName;
    this.startDate = input.startDate;
    this.endDate = input.endDate;
    this.coverage = input.coverage;
    this.halfDaySession = input.halfDaySession;
  }
}
