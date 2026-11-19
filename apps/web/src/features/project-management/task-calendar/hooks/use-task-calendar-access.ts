'use client';

import {
  canAccessTaskCalendar,
  canViewOrganizationDailyTasks,
  canViewOrganizationProjectTasksOnCalendar,
  canViewTaskCalendarDailyTasks,
  canViewTaskCalendarProjectTasks,
  hasPmDailyTaskAssignPermission,
} from '@techwin/contracts';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { useIsPlatformSuperAdmin } from '@/features/auth/hooks/use-is-platform-super-admin';

export function useTaskCalendarAccess() {
  const { permissionSet, hasAny } = usePermissions();
  const isPlatformSuperAdmin = useIsPlatformSuperAdmin();

  const canAccess = canAccessTaskCalendar(permissionSet, isPlatformSuperAdmin);
  const canViewDaily = canViewTaskCalendarDailyTasks(permissionSet, isPlatformSuperAdmin);
  const canViewProject = canViewTaskCalendarProjectTasks(permissionSet, isPlatformSuperAdmin);
  const orgWideDaily =
    canViewDaily && canViewOrganizationDailyTasks(permissionSet, isPlatformSuperAdmin);
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
