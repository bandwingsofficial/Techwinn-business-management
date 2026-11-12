import type { PermissionKey } from '@techwin/contracts';
import type { MembershipAccessContext } from '@/features/auth/membership/membership-access';
import {
  canAccessWorkspaceDashboard,
  canUseEmployeeSelfService,
} from '@/features/auth/membership/membership-access';
import { canViewOrganizationDailyTasks } from '@/features/admin/daily-tasks/utils/daily-tasks-organization-scope';
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
  '/admin/whatsapp/inbox',
];

/** Self-service task URLs hidden when the user can view organization task boards. */
const EMPLOYEE_TASK_DUPLICATES: ReadonlySet<string> = new Set([
  '/employee/dashboard',
  '/employee/daily-tasks',
  '/employee/task-calendar',
]);

/**
 * Organization daily-task board routes hidden for self-service task accounts.
 * `/admin/project-tasks` is intentionally excluded — Projects & Tasks View
 * (`projects.read` / `tasks.read`) controls that page independently.
 */
const ADMIN_TASK_DUPLICATES: ReadonlySet<string> = new Set([
  '/admin/daily-tasks',
  '/admin/task-calendar',
  '/admin/my-tasks',
]);

function hasOrganizationTaskView(permissions: ReadonlySet<PermissionKey>): boolean {
  return canViewOrganizationDailyTasks(
    (key) => permissions.has(key),
    (...keys) => keys.some((key) => permissions.has(key)),
  );
}

export function prefersOrganizationWorkspace(
  permissions: ReadonlySet<PermissionKey>,
  access?: MembershipAccessContext,
): boolean {
  if (access && canAccessWorkspaceDashboard(access)) return true;
  if (hasOrganizationTaskView(permissions)) return true;
  return ORGANIZATION_WORKSPACE_ROUTES.some((route) => canAccessAppPath(route, permissions, access));
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
  const orgTasks = hasOrganizationTaskView(permissions);
  if (orgTasks && EMPLOYEE_TASK_DUPLICATES.has(href)) return false;
  if (!orgTasks && ADMIN_TASK_DUPLICATES.has(href)) return false;
  // Keep admin org calendar out of pure self-service sessions (they use /employee/calendar).
  if (!prefersOrganizationWorkspace(permissions, access) && href === '/admin/calendar') {
    return false;
  }
  return true;
}

export function canonicalDailyTasksPath(
  permissions: ReadonlySet<PermissionKey>,
  _access?: MembershipAccessContext,
): string {
  return hasOrganizationTaskView(permissions) ? '/admin/daily-tasks' : '/employee/daily-tasks';
}

export function canonicalTaskCalendarPath(
  permissions: ReadonlySet<PermissionKey>,
  _access?: MembershipAccessContext,
): string {
  return hasOrganizationTaskView(permissions) ? '/admin/task-calendar' : '/employee/task-calendar';
}
