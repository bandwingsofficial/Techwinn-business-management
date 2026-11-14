'use client';

import {
  hasProjectsCompletePermission,
  hasProjectsCreatePermission,
  hasProjectsDeletePermission,
  hasProjectsEditPermission,
  hasProjectsPlanCreatePermission,
  hasProjectsPlanEditPermission,
  hasProjectsProductionStartPermission,
  hasProjectsProductionViewPermission,
  hasProjectsStatusPermission,
  hasProjectsViewPermission,
} from '@techwin/contracts';
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';

export function useProjectPagePermissions() {
  const { permissionSet } = useAdminAccess();

  return {
    canView: hasProjectsViewPermission(permissionSet),
    canCreate: hasProjectsCreatePermission(permissionSet),
    canChangeStatus: hasProjectsStatusPermission(permissionSet),
    canEdit: hasProjectsEditPermission(permissionSet),
    canDelete: hasProjectsDeletePermission(permissionSet),
    canCreatePlan: hasProjectsPlanCreatePermission(permissionSet),
    canEditPlan: hasProjectsPlanEditPermission(permissionSet),
    canStartProduction: hasProjectsProductionStartPermission(permissionSet),
    canOpenProductionBoard: hasProjectsProductionViewPermission(permissionSet),
    canComplete: hasProjectsCompletePermission(permissionSet),
  };
}