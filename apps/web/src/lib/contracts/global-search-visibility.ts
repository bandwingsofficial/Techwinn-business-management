import type { PermissionKey } from './permissions';
import {
  ATTENDANCE_PUNCH_PAGE_VIEW,
  ATTENDANCE_PUNCH_VIEW_ALL,
  ATTENDANCE_PUNCH_VIEW_DETAILS,
  ATTENDANCE_RECORDS_PAGE_VIEW,
  hasAttendancePermission,
} from './attendance-permission-keys';
import {
  canViewOrganizationDailyTasks,
  canViewOrganizationProjectTasks,
  canViewOwnDailyTasks,
} from './task-visibility';
import type { GlobalSearchCategory } from './global-search';

export type GlobalSearchScopeFlags = {
  readonly dailyTasksOwnOnly: boolean;
  readonly dailyTasksIncludeDescription: boolean;
  readonly attendanceOwnOnly: boolean;
  readonly projectTasksOwnOnly: boolean;
  readonly includeEmployeeDirectory: boolean;
  readonly includeOwnProfile: boolean;
};

export function resolveGlobalSearchCategories(
  permissions: ReadonlySet<PermissionKey>,
  isPlatformSuperAdmin: boolean,
  sessionEmployeeId: string | null,
): ReadonlySet<GlobalSearchCategory> {
  const categories = new Set<GlobalSearchCategory>();
  const flags = resolveGlobalSearchScope(permissions, isPlatformSuperAdmin, sessionEmployeeId);

  if (flags.dailyTasksOwnOnly || canViewOrganizationDailyTasks(permissions, isPlatformSuperAdmin)) {
    categories.add('daily_task');
  }

  if (flags.includeEmployeeDirectory) {
    categories.add('employee');
  } else if (flags.includeOwnProfile) {
    categories.add('employee_profile');
  }

  if (
    flags.attendanceOwnOnly ||
    hasAttendancePermission(permissions, ATTENDANCE_RECORDS_PAGE_VIEW) ||
    hasAttendancePermission(permissions, ATTENDANCE_PUNCH_VIEW_ALL)
  ) {
    categories.add('attendance');
  }

  if (isPlatformSuperAdmin || permissions.has('crm.leads.view') || permissions.has('leads.read')) {
    categories.add('lead');
  }

  if (isPlatformSuperAdmin || permissions.has('crm.clients.view') || permissions.has('clients.read')) {
    categories.add('client');
  }

  if (isPlatformSuperAdmin || permissions.has('projects.read')) {
    categories.add('project');
    categories.add('project_task');
  }

  if (isPlatformSuperAdmin || permissions.has('crm.service_packages.view')) {
    categories.add('service_package');
  }

  if (isPlatformSuperAdmin || permissions.has('crm.quotations.view')) {
    categories.add('proposal');
  }

  return categories;
}

export function resolveGlobalSearchScope(
  permissions: ReadonlySet<PermissionKey>,
  isPlatformSuperAdmin: boolean,
  sessionEmployeeId: string | null,
): GlobalSearchScopeFlags {
  const orgDailyTasks = canViewOrganizationDailyTasks(permissions, isPlatformSuperAdmin);
  const ownDailyTasks = Boolean(sessionEmployeeId && canViewOwnDailyTasks(permissions));

  const orgAttendance =
    isPlatformSuperAdmin ||
    hasAttendancePermission(permissions, ATTENDANCE_RECORDS_PAGE_VIEW) ||
    hasAttendancePermission(permissions, ATTENDANCE_PUNCH_VIEW_ALL);

  const ownAttendance = Boolean(
    sessionEmployeeId &&
      !orgAttendance &&
      (hasAttendancePermission(permissions, ATTENDANCE_PUNCH_PAGE_VIEW) ||
        hasAttendancePermission(permissions, ATTENDANCE_PUNCH_VIEW_DETAILS) ||
        hasAttendancePermission(permissions, ATTENDANCE_RECORDS_PAGE_VIEW)),
  );

  const orgProjectTasks = canViewOrganizationProjectTasks(permissions, isPlatformSuperAdmin);

  const includeEmployeeDirectory =
    isPlatformSuperAdmin || permissions.has('employees.view') || permissions.has('employees.read');

  const includeOwnProfile = Boolean(sessionEmployeeId && !includeEmployeeDirectory);

  return {
    dailyTasksOwnOnly: !orgDailyTasks && ownDailyTasks,
    dailyTasksIncludeDescription:
      isPlatformSuperAdmin ||
      orgDailyTasks ||
      permissions.has('project_management.daily_tasks.view_details'),
    attendanceOwnOnly: ownAttendance,
    projectTasksOwnOnly: Boolean(permissions.has('projects.read') && !orgProjectTasks && !isPlatformSuperAdmin),
    includeEmployeeDirectory,
    includeOwnProfile,
  };
}