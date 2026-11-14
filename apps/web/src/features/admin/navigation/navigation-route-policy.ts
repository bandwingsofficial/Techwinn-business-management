import {
  canAccessTaskCalendar,
  PM_DAILY_TASKS_VIEW_KEY,
  type PermissionKey,
} from '@techwin/contracts';
import type { MembershipAccessContext } from '@/features/auth/membership/membership-access';
import {
  canUseEmployeeSelfService,
  hasWorkspaceDashboardMembershipAccess,
} from '@/features/auth/membership/membership-access';
import { mapHrefToPortalSegment } from '@/features/auth/portal/portal-segment';
import { canAccessAppPath } from '@/shared/navigation/app-route-permissions';

/**
 * Admin modules that indicate CRM / HR / communications collaboration.
 * Used for workspace classification — not for task-route canonicalization alone
 * (Employee accounts also have `projects.read` / `tasks.read`).
 */
const ORGANIZATION_WORKSPACE_ROUTES: readonly string[] = [
  '/admin/pipeline',
  '/admin/leads',
  '/admin/clients',
  '/admin/quotations',
  '/admin/packages',
  '/admin/employees',
  '/admin/users',
  '/admin/roles',
  '/admin/leave',
  '/admin/leave-types',
  '/admin/leave-balances',
  '/admin/employee-leave-records',
  '/admin/attendance',
  '/admin/attendance/punch',
  '/admin/whatsapp/inbox',
];

const EMPLOYEE_DAILY_TASKS_ROUTE = '/employee/daily-tasks';
const EMPLOYEE_TASK_CALENDAR_ROUTE = '/employee/task-calendar';

const ADMIN_DAILY_TASK_ROUTES: ReadonlySet<string> = new Set([
  '/admin/daily-tasks',
  '/admin/my-tasks',
]);

const ADMIN_TASK_CALENDAR_ROUTES: ReadonlySet<string> = new Set(['/admin/task-calendar']);

function hasOrganizationDailyTasksView(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has(PM_DAILY_TASKS_VIEW_KEY);
}

function hasOrganizationTaskCalendarView(permissions: ReadonlySet<PermissionKey>): boolean {
  return canAccessTaskCalendar(permissions);
}

/** Permission-based org workspace (CRM/HR/admin modules); does not inspect membership roles. */
export function hasOrganizationWorkspacePermissionSignals(
  permissions: ReadonlySet<PermissionKey>,
  access?: MembershipAccessContext,
): boolean {
  if (hasOrganizationDailyTasksView(permissions) || hasOrganizationTaskCalendarView(permissions)) {
    return true;
  }
  return ORGANIZATION_WORKSPACE_ROUTES.some((route) =>
    canAccessAppPath(route, permissions, access, undefined),
  );
}

export function prefersOrganizationWorkspace(
  permissions: ReadonlySet<PermissionKey>,
  access?: MembershipAccessContext,
): boolean {
  if (access && hasWorkspaceDashboardMembershipAccess(access)) return true;
  return hasOrganizationWorkspacePermissionSignals(permissions, access);
}

/** Whether a nav href should appear after canonical-route deduplication. */
export function shouldShowNavHref(
  href: string,
  permissions: ReadonlySet<PermissionKey>,
  access?: MembershipAccessContext,
): boolean {
  if (access && href.startsWith('/employee') && !canUseEmployeeSelfService(access)) {
    return false;
  }
  if (hasOrganizationDailyTasksView(permissions) && href === EMPLOYEE_DAILY_TASKS_ROUTE) {
    return false;
  }
  if (hasOrganizationTaskCalendarView(permissions) && href === EMPLOYEE_TASK_CALENDAR_ROUTE) {
    return false;
  }
  if (!hasOrganizationDailyTasksView(permissions) && ADMIN_DAILY_TASK_ROUTES.has(href)) {
    return false;
  }
  if (!hasOrganizationTaskCalendarView(permissions) && ADMIN_TASK_CALENDAR_ROUTES.has(href)) {
    return false;
  }
  if (!prefersOrganizationWorkspace(permissions, access) && href === '/admin/calendar') {
    return false;
  }
  return true;
}

export function canonicalDailyTasksPath(
  permissions: ReadonlySet<PermissionKey>,
  _access?: MembershipAccessContext,
  portalSegment = 'admin',
): string {
  return hasOrganizationDailyTasksView(permissions)
    ? mapHrefToPortalSegment('/admin/daily-tasks', portalSegment)
    : '/employee/daily-tasks';
}

export function canonicalTaskCalendarPath(
  permissions: ReadonlySet<PermissionKey>,
  _access?: MembershipAccessContext,
  portalSegment = 'admin',
): string {
  return hasOrganizationTaskCalendarView(permissions)
    ? mapHrefToPortalSegment('/admin/task-calendar', portalSegment)
    : '/employee/task-calendar';
}
