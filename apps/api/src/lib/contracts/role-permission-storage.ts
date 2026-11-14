import { stripOrphanedLegacyCrmPermissionKeys } from './permission-legacy-crm-cleanup.js';
import { ensurePermissionPrerequisites } from './permission-view-dependencies.js';
import { isPermissionKey, type PermissionKey } from './permissions.js';

/** Normalize selected keys before persisting to organization_role_permissions (no legacy expansion). */
export function permissionKeysForRoleStorage(keys: readonly PermissionKey[]): PermissionKey[] {
  const unique = new Set<PermissionKey>();
  for (const key of keys) {
    if (isPermissionKey(key)) unique.add(key);
  }
  stripOrphanedLegacyCrmPermissionKeys(unique);
  return [...new Set(ensurePermissionPrerequisites([...unique]))].sort();
}

/** Read stored role permission rows for Role Management (exact DB keys, no legacy expansion). */
export function permissionKeysFromRoleStorage(keys: readonly string[]): PermissionKey[] {
  const unique = new Set<PermissionKey>();
  for (const key of keys) {
    if (isPermissionKey(key)) unique.add(key);
  }
  stripOrphanedLegacyCrmPermissionKeys(unique);
  return [...unique].sort();
}

export function rolePermissionSetsMatch(
  submitted: readonly PermissionKey[],
  persisted: readonly PermissionKey[],
): boolean {
  const expected = new Set(permissionKeysForRoleStorage(submitted));
  const actual = new Set(permissionKeysFromRoleStorage(persisted));
  if (expected.size !== actual.size) return false;
  for (const key of expected) {
    if (!actual.has(key)) return false;
  }
  return true;
}