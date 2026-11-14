import type { PermissionKey } from './permissions.js';

export const EMPLOYEES_VIEW_KEY = 'employees.view' as const satisfies PermissionKey;

export const EMPLOYEE_PERMISSION_KEYS = [
  EMPLOYEES_VIEW_KEY,
  'employees.create',
  'employees.view_details',
  'employees.status',
  'employees.edit',
  'employees.delete',
] as const satisfies readonly PermissionKey[];

export type EmployeePermissionKey = (typeof EMPLOYEE_PERMISSION_KEYS)[number];

/** @deprecated Legacy keys kept for persisted role rows and runtime expansion. */
export const LEGACY_EMPLOYEE_PERMISSION_KEYS = [
  'employees.read',
  'employees.update',
] as const satisfies readonly PermissionKey[];

/** Salary permissions kept in catalog / handlers; excluded from Employees role matrix. */
export const EMPLOYEE_COMPENSATION_PERMISSION_KEYS = [
  'employees.compensation.read',
  'employees.compensation.manage',
] as const satisfies readonly PermissionKey[];

export const EMPLOYEES_HIERARCHY_EXCLUDED_KEYS = [
  ...LEGACY_EMPLOYEE_PERMISSION_KEYS,
  ...EMPLOYEE_COMPENSATION_PERMISSION_KEYS,
] as const satisfies readonly PermissionKey[];

const EMPLOYEE_KEY_SET = new Set<string>(EMPLOYEE_PERMISSION_KEYS);

export function isEmployeePermissionKey(key: PermissionKey): key is EmployeePermissionKey {
  return EMPLOYEE_KEY_SET.has(key);
}

export function expandLegacyEmployeePermissions(keys: Set<PermissionKey>): void {
  const ensureView = () => {
    if (!keys.has(EMPLOYEES_VIEW_KEY)) keys.add(EMPLOYEES_VIEW_KEY);
  };

  if (keys.has('employees.read')) {
    if (!keys.has(EMPLOYEES_VIEW_KEY)) keys.add(EMPLOYEES_VIEW_KEY);
  }

  if (keys.has('employees.create')) ensureView();

  if (keys.has('employees.update')) {
    ensureView();
    const lifecycle: PermissionKey[] = ['employees.edit', 'employees.status', 'employees.delete'];
    for (const key of lifecycle) {
      if (!keys.has(key)) keys.add(key);
    }
  }

  if (keys.has('employees.delete')) ensureView();
  for (const key of EMPLOYEE_PERMISSION_KEYS) {
    if (key !== EMPLOYEES_VIEW_KEY && keys.has(key)) {
      ensureView();
      break;
    }
  }
}

export function stripEmployeesWithoutView(keys: Set<PermissionKey>): void {
  if (keys.has(EMPLOYEES_VIEW_KEY)) return;
  for (const key of EMPLOYEE_PERMISSION_KEYS) {
    keys.delete(key);
  }
}

export function hasEmployeesViewPermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has(EMPLOYEES_VIEW_KEY);
}

export function hasEmployeesCreatePermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('employees.create');
}

export function hasEmployeesViewDetailsPermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('employees.view_details');
}

export function hasEmployeesStatusPermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('employees.status');
}

export function hasEmployeesEditPermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('employees.edit');
}

export function hasEmployeesDeletePermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('employees.delete');
}