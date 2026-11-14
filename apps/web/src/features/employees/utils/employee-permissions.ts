import {
  hasEmployeesCreatePermission,
  hasEmployeesDeletePermission,
  hasEmployeesEditPermission,
  hasEmployeesStatusPermission,
  hasEmployeesViewDetailsPermission,
  hasEmployeesViewPermission,
  type PermissionKey,
} from '@techwin/contracts';

export function canViewEmployeesPage(permissions: ReadonlySet<PermissionKey>): boolean {
  return hasEmployeesViewPermission(permissions);
}

export function canCreateEmployees(permissions: ReadonlySet<PermissionKey>): boolean {
  return hasEmployeesCreatePermission(permissions);
}

export function canViewEmployeeDetails(permissions: ReadonlySet<PermissionKey>): boolean {
  return hasEmployeesViewDetailsPermission(permissions);
}

export function canChangeEmployeeStatus(permissions: ReadonlySet<PermissionKey>): boolean {
  return hasEmployeesStatusPermission(permissions);
}

export function canEditEmployees(permissions: ReadonlySet<PermissionKey>): boolean {
  return hasEmployeesEditPermission(permissions);
}

export function canDeleteEmployees(permissions: ReadonlySet<PermissionKey>): boolean {
  return hasEmployeesDeletePermission(permissions);
}

export function canReadEmployeeCompensation(
  has: (key: PermissionKey) => boolean,
): boolean {
  return has('employees.compensation.read');
}

export function canManageEmployeeCompensation(
  has: (key: PermissionKey) => boolean,
): boolean {
  return has('employees.compensation.manage');
}