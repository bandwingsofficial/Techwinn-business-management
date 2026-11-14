import {
  EMPLOYEE_PERMISSION_KEYS,
  EMPLOYEES_VIEW_KEY,
  isEmployeePermissionKey,
  stripEmployeesWithoutView,
} from './employees-permissions.js';
import type { PermissionKey } from './permissions.js';

export const EMPLOYEES_HIERARCHY_KEYS = EMPLOYEE_PERMISSION_KEYS;

export function applyEmployeesCrossPagePrerequisites(keys: Set<PermissionKey>): void {
  stripEmployeesWithoutView(keys);
}