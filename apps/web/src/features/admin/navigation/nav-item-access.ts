import { hasUnrestrictedOrgPermissions, type PermissionKey } from '@techwin/contracts';
import {
  canAccessWorkspaceDashboard,
  canUseEmployeeSelfService,
  type MembershipAccessContext,
} from '@/features/auth/membership/membership-access';
import {
  APP_ROUTE_PERMISSIONS_ALL,
  permissionsForAppPath,
} from '@/shared/navigation/app-route-permissions';

const ORGANIZATION_DAILY_TASK_NAV_HREFS: ReadonlySet<string> = new Set([
  '/admin/daily-tasks',
  '/admin/my-tasks',
]);

const ORGANIZATION_TASK_CALENDAR_NAV_HREFS: ReadonlySet<string> = new Set(['/admin/task-calendar']);

const PM_DAILY_TASKS_VIEW_KEY = 'project_management.daily_tasks.view' as const satisfies PermissionKey;
const PM_TASK_CALENDAR_VIEW_KEY = 'project_management.task_calendar.view' as const satisfies PermissionKey;

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

  if (hasUnrestrictedOrgPermissions(permissions)) {
    if (configHref === '/employee/dashboard' || configHref.startsWith('/employee/')) {
      return access ? canUseEmployeeSelfService(access) : false;
    }
    if (configHref === '/admin/dashboard') {
      return access ? canAccessWorkspaceDashboard(access) : true;
    }
    return true;
  }

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
    return permissions.has(PM_DAILY_TASKS_VIEW_KEY);
  }

  if (ORGANIZATION_TASK_CALENDAR_NAV_HREFS.has(configHref)) {
    return permissions.has(PM_TASK_CALENDAR_VIEW_KEY);
  }

  const allRequired = APP_ROUTE_PERMISSIONS_ALL[configHref];
  if (allRequired) {
    return allRequired.every((key) => permissions.has(key));
  }

  const required = permissionsForAppPath(configHref);
  if (required === null || required.length === 0) return false;
  return required.some((key) => permissions.has(key));
}
