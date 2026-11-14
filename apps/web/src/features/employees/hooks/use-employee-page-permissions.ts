'use client';

import {
  hasEmployeesCreatePermission,
  hasEmployeesDeletePermission,
  hasEmployeesEditPermission,
  hasEmployeesStatusPermission,
  hasEmployeesViewDetailsPermission,
  hasEmployeesViewPermission,
} from '@techwin/contracts';
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';

export function useEmployeePagePermissions() {
  const { permissionSet } = useAdminAccess();

  return {
    canViewPage: hasEmployeesViewPermission(permissionSet),
    canCreate: hasEmployeesCreatePermission(permissionSet),
    canViewDetails: hasEmployeesViewDetailsPermission(permissionSet),
    canChangeStatus: hasEmployeesStatusPermission(permissionSet),
    canEdit: hasEmployeesEditPermission(permissionSet),
    canDelete: hasEmployeesDeletePermission(permissionSet),
  };
}