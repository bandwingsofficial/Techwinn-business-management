'use client';

import {
  canAccessTaskCalendar,
  canViewOrganizationProjectTasksOnCalendar,
  canViewTaskCalendarDailyTasks,
  canViewTaskCalendarProjectTasks,
  hasPmDailyTaskAssignPermission,
} from '@techwin/contracts';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { useIsPlatformSuperAdmin } from '@/features/auth/hooks/use-is-platform-super-admin';
import { canViewOrganizationDailyTasks } from '@/features/admin/daily-tasks/utils/daily-tasks-organization-scope';

export function useTaskCalendarAccess() {
  const { permissionSet, has, hasAny } = usePermissions();
  const isPlatformSuperAdmin = useIsPlatformSuperAdmin();

  const canAccess = canAccessTaskCalendar(permissionSet, isPlatformSuperAdmin);
  const canViewDaily = canViewTaskCalendarDailyTasks(permissionSet, isPlatformSuperAdmin);
  const canViewProject = canViewTaskCalendarProjectTasks(permissionSet, isPlatformSuperAdmin);
  const orgWideDaily = canViewDaily && canViewOrganizationDailyTasks(has, hasAny);
  const orgWideProject = canViewProject && canViewOrganizationProjectTasksOnCalendar(
    permissionSet,
    isPlatformSuperAdmin,
  );
  const organizationScope = orgWideDaily || orgWideProject;
  const canAddDailyTask =
    canViewDaily &&
    (hasPmDailyTaskAssignPermission(permissionSet) || hasAny('tasks.create', 'tasks.assign'));

  return {
    canAccess,
    canViewDaily,
    canViewProject,
    orgWideDaily,
    orgWideProject,
    organizationScope,
    canAddDailyTask,
  };
}
