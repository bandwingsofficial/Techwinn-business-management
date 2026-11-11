import { API_ERROR_CODES } from '@techwin/contracts';
import { isApiError } from '../../../shared/api/api-error';

/** User-facing attendance error copy (today/history/punch). */
export function describeAttendanceError(failure: unknown): string {
  if (!isApiError(failure)) {
    return failure instanceof Error ? failure.message : 'Something went wrong.';
  }
  if (failure.code === API_ERROR_CODES.EMPLOYEE_PROFILE_NOT_LINKED) {
    return (
      failure.message ||
      'No active employee profile is linked to your account. Ask an administrator to link your user to an employee record before using attendance.'
    );
  }
  if (failure.status === 401 || failure.code === API_ERROR_CODES.SESSION_EXPIRED) {
    return 'Your session has ended. Please sign in again.';
  }
  if (failure.status === 429 || failure.code === API_ERROR_CODES.RATE_LIMITED) {
    const wait = failure.retryAfterSeconds;
    return wait
      ? `Too many requests. Try again in ${wait} seconds.`
      : 'Too many requests. Please wait a moment and try again.';
  }
  if (failure.status === 403) {
    const message = failure.message?.trim();
    if (message && /permission|forbidden|access/i.test(message)) {
      return message;
    }
    return 'You do not have permission to view attendance.';
  }
  if (failure.isTransient) {
    return 'Could not load attendance right now. Please try again.';
  }
  return failure.message || 'Something went wrong.';
}

/**
 * Only retry after refreshing permissions when the 403 might be stale RBAC,
 * not when the account legitimately has no linked employee profile.
 */
export function isStalePermissionForbidden(failure: unknown): boolean {
  return (
    isApiError(failure) &&
    failure.status === 403 &&
    failure.code !== API_ERROR_CODES.EMPLOYEE_PROFILE_NOT_LINKED &&
    (failure.code === API_ERROR_CODES.FORBIDDEN ||
      failure.code === API_ERROR_CODES.MEMBERSHIP_DENIED ||
      failure.code === null)
  );
}
