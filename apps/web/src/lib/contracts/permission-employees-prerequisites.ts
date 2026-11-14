import {
  EMPLOYEE_PERMISSION_KEYS,
  EMPLOYEES_VIEW_KEY,
  isEmployeePermissionKey,
  stripEmployeesWithoutView,
} from './employees-permissions';
import { EMPLOYEES_VIEW_PAGE_TOOLTIP } from './permission-employees-tooltips';
import type { PermissionKey } from './permissions';

export { EMPLOYEES_VIEW_PAGE_TOOLTIP };

export const EMPLOYEES_HIERARCHY_KEYS = EMPLOYEE_PERMISSION_KEYS;

export function employeesPermissionBlockedReason(
  key: PermissionKey,
  selected: ReadonlySet<PermissionKey>,
): string | null {
  if (!isEmployeePermissionKey(key)) return null;
  if (key === EMPLOYEES_VIEW_KEY) return null;
  if (!selected.has(EMPLOYEES_VIEW_KEY)) {
    return EMPLOYEES_VIEW_PAGE_TOOLTIP;
  }
  return null;
}

export function applyEmployeesCrossPagePrerequisites(keys: Set<PermissionKey>): void {
  stripEmployeesWithoutView(keys);
}