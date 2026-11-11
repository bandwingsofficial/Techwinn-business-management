export class AttendanceError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'AttendanceError';
  }
}

export class AttendanceNotFoundError extends AttendanceError {
  constructor(entity = 'Attendance record') {
    super(`${entity} was not found.`, 'ATTENDANCE_NOT_FOUND');
    this.name = 'AttendanceNotFoundError';
  }
}

export class AttendanceForbiddenError extends AttendanceError {
  constructor(message = 'Attendance action is not allowed.') {
    super(message, 'ATTENDANCE_FORBIDDEN');
    this.name = 'AttendanceForbiddenError';
  }
}

/** Self-service attendance requires an active linked employee profile. */
export class AttendanceEmployeeProfileNotLinkedError extends AttendanceError {
  constructor(message = 'No active employee profile is linked to your account.') {
    super(message, 'ATTENDANCE_EMPLOYEE_PROFILE_NOT_LINKED');
    this.name = 'AttendanceEmployeeProfileNotLinkedError';
  }
}

export class AttendanceConflictError extends AttendanceError {
  constructor(message: string) {
    super(message, 'ATTENDANCE_CONFLICT');
    this.name = 'AttendanceConflictError';
  }
}

export class AttendancePolicyError extends AttendanceError {
  constructor(message: string, code = 'ATTENDANCE_POLICY') {
    super(message, code);
    this.name = 'AttendancePolicyError';
  }
}
