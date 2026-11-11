/**
 * Run: `node --test scripts/leave-self-service-authz.test.mjs`
 *
 * Documents leave self-service authorization outcomes without Nest DI.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

function requireEmployeeIdOutcome(actor, resolvedEmployeeId) {
  if (actor.isPlatformSuperAdmin) {
    return {
      ok: false,
      code: 'LEAVE_EMPLOYEE_PROFILE_NOT_LINKED',
      messageIncludes: 'Super Admin',
    };
  }
  if (!resolvedEmployeeId) {
    return {
      ok: false,
      code: 'LEAVE_EMPLOYEE_PROFILE_NOT_LINKED',
      messageIncludes: 'employee profile',
    };
  }
  return { ok: true, employeeId: resolvedEmployeeId };
}

test('Super Admin self-service leave resolves to EMPLOYEE_PROFILE_NOT_LINKED style denial', () => {
  const result = requireEmployeeIdOutcome(
    { organizationId: 'org', adminId: 'sa', isPlatformSuperAdmin: true },
    null,
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, 'LEAVE_EMPLOYEE_PROFILE_NOT_LINKED');
  assert.match(result.messageIncludes, /Super Admin/i);
});

test('Member without linked employee gets profile-not-linked denial', () => {
  const result = requireEmployeeIdOutcome(
    { organizationId: 'org', adminId: 'm1', isPlatformSuperAdmin: false },
    null,
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, 'LEAVE_EMPLOYEE_PROFILE_NOT_LINKED');
});

test('Eligible employee receives own employee id', () => {
  const result = requireEmployeeIdOutcome(
    { organizationId: 'org', adminId: 'm2', isPlatformSuperAdmin: false },
    'emp-22',
  );
  assert.equal(result.ok, true);
  assert.equal(result.employeeId, 'emp-22');
});
