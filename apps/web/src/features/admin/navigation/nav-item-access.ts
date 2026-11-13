import type { PermissionKey } from '@techwin/contracts';
import {
  canAccessWorkspaceDashboard,
  canUseEmployeeSelfService,
  type MembershipAccessContext,
} from '@/features/auth/membership/membership-access';
import { permissionsForAppPath } from '@/shared/navigation/app-route-permissions';

const ORGANIZATION_DAILY_TASK_NAV_HREFS: ReadonlySet<string> = new Set([
  '/admin/daily-tasks',
  '/admin/task-calendar',
  '/admin/my-tasks',
]);

const DAILY_TASK_MANAGE_KEYS: readonly PermissionKey[] = [
  'tasks.create',
  'tasks.assign',
  'tasks.update',
  'tasks.delete',
];

export function isDashboardNavConfigHref(href: string): boolean {
  return href === '/admin/dashboard' || href === '/employee/dashboard';
}

/**
 * Strict sidebar visibility: requires explicit View/read keys from {@link permissionsForAppPath}.
 * Does not use portal fallthrough, org-task shortcuts, or empty permission lists as allow-all.
 */
export function canAccessNavItem(
  configHref: string,
  permissions: ReadonlySet<PermissionKey>,
  access?: MembershipAccessContext,
): boolean {
  if (permissions.size === 0) return false;

  if (configHref === '/admin/dashboard') {
    return access ? canAccessWorkspaceDashboard(access) : false;
  }
  if (configHref === '/employee/dashboard') {
    return access ? canUseEmployeeSelfService(access) : false;
  }

  if (configHref.startsWith('/employee/')) {
    if (!access || !canUseEmployeeSelfService(access)) return false;
  }

  if (ORGANIZATION_DAILY_TASK_NAV_HREFS.has(configHref)) {
    if (DAILY_TASK_MANAGE_KEYS.some((key) => permissions.has(key))) return true;
    if (!permissions.has('tasks.read')) return false;
  }

  const required = permissionsForAppPath(configHref);
  if (required === null || required.length === 0) return false;
  return required.some((key) => permissions.has(key));
}
