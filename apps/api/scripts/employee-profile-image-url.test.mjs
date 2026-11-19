import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveEmployeeProfileImageUrl } from '../dist/lib/persistence/employee-profile-image-url.js';
import { EMPLOYEE_ROUTES } from '../dist/lib/contracts/index.js';

test('resolveEmployeeProfileImageUrl returns stored-object content route', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.equal(
    resolveEmployeeProfileImageUrl({
      profileImageUrl: 'https://legacy.example/photo.jpg',
      profileImageStoredObjectId: id,
    }),
    EMPLOYEE_ROUTES.employeeStoredProfileImageContent(id),
  );
});

test('resolveEmployeeProfileImageUrl falls back to legacy URL when no stored object', () => {
  assert.equal(
    resolveEmployeeProfileImageUrl({
      profileImageUrl: 'https://cdn.example/avatars/alice.jpg',
      profileImageStoredObjectId: null,
    }),
    'https://cdn.example/avatars/alice.jpg',
  );
});

test('resolveEmployeeProfileImageUrl is null when neither field is set', () => {
  assert.equal(
    resolveEmployeeProfileImageUrl({ profileImageUrl: null, profileImageStoredObjectId: null }),
    null,
  );
});