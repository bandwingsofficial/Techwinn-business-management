/**
 * Run: `pnpm --filter @techwin/web run test:attendance-errors`
 *
 * Mirrors `src/features/employee/utils/attendance-errors.ts` without importing
 * TypeScript parameter-property classes (unsupported by Node strip-types).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { API_ERROR_CODES } from '../src/lib/contracts/errors.ts';

function isApiError(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    'kind' in value &&
    'status' in value &&
    'code' in value
  );
}

function describeAttendanceError(failure) {
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
    const message = typeof failure.message === 'string' ? failure.message.trim() : '';
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

function isStalePermissionForbidden(failure) {
  return (
    isApiError(failure) &&
    failure.status === 403 &&
    failure.code !== API_ERROR_CODES.EMPLOYEE_PROFILE_NOT_LINKED &&
    (failure.code === API_ERROR_CODES.FORBIDDEN ||
      failure.code === API_ERROR_CODES.MEMBERSHIP_DENIED ||
      failure.code === null)
  );
}

test('EMPLOYEE_PROFILE_NOT_LINKED shows intentional empty-state message', () => {
  const error = {
    kind: 'http',
    message: 'No active employee profile is linked to your account.',
    status: 403,
    code: API_ERROR_CODES.EMPLOYEE_PROFILE_NOT_LINKED,
    isTransient: false,
  };
  assert.match(describeAttendanceError(error), /employee profile/i);
  assert.equal(isStalePermissionForbidden(error), false);
});

test('generic FORBIDDEN may retry after permission refresh', () => {
  const error = {
    kind: 'http',
    message: 'Denied',
    status: 403,
    code: API_ERROR_CODES.FORBIDDEN,
    isTransient: false,
  };
  assert.equal(isStalePermissionForbidden(error), true);
  assert.match(describeAttendanceError(error), /permission/i);
});

test('429 surfaces retry guidance without session-expired wording', () => {
  const error = {
    kind: 'http',
    message: 'Too many requests',
    status: 429,
    code: API_ERROR_CODES.RATE_LIMITED,
    retryAfterSeconds: 12,
    isTransient: true,
  };
  assert.match(describeAttendanceError(error), /12 seconds/i);
});

test('401 is distinguished from missing employee profile', () => {
  const error = {
    kind: 'http',
    message: 'Gone',
    status: 401,
    code: API_ERROR_CODES.SESSION_EXPIRED,
    isTransient: false,
  };
  assert.match(describeAttendanceError(error), /session has ended/i);
  assert.equal(isStalePermissionForbidden(error), false);
});

test('contracts export EMPLOYEE_PROFILE_NOT_LINKED', () => {
  assert.equal(API_ERROR_CODES.EMPLOYEE_PROFILE_NOT_LINKED, 'EMPLOYEE_PROFILE_NOT_LINKED');
});
