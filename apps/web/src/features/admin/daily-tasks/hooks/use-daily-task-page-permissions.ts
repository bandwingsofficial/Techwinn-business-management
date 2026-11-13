import {
  hasPmDailyTaskAssignPermission,
  hasPmDailyTaskDeletePermission,
  hasPmDailyTaskEditPermission,
  hasPmDailyTaskMovePermission,
  hasPmDailyTaskViewDetailsPermission,
  hasPmDailyTaskViewPagePermission,
} from '@techwin/contracts';
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';
import { canViewOrganizationDailyTasks } from '@/features/admin/daily-tasks/utils/daily-tasks-organization-scope';
import { usePermissions } from '@/features/auth/components/permissions-provider';

export function useDailyTaskPagePermissions() {
  const { has, hasAny, loading: adminLoading } = useAdminAccess();
  const { loading: permissionsLoading, permissionSet } = usePermissions();
  const canViewOrgBoard = canViewOrganizationDailyTasks(has, hasAny);
  const canViewPage =
    hasPmDailyTaskViewPagePermission(permissionSet) || canViewOrgBoard;
  const canAssign = hasPmDailyTaskAssignPermission(permissionSet);
  const canViewDetails = hasPmDailyTaskViewDetailsPermission(permissionSet);
  const canEdit = hasPmDailyTaskEditPermission(permissionSet);
  const canDelete = hasPmDailyTaskDeletePermission(permissionSet);
  const canMove = hasPmDailyTaskMovePermission(permissionSet);
  const showCardMenu = canViewDetails || canEdit || canDelete;
  const canManageWorkflow = has('tasks.update') || has('daily_tasks.manage_workflow');
  return {
    loading: adminLoading || permissionsLoading,
    canViewPage,
    canAssign,
    canViewDetails,
    canEdit,
    canDelete,
    canMove,
    showCardMenu,
    canManageWorkflow,
  };
}
