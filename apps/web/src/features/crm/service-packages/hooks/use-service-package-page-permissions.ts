import { usePermissions } from '@/features/auth/components/permissions-provider';

export function useServicePackagePagePermissions() {
  const { has, loading } = usePermissions();
  const canViewPage = has('crm.service_packages.view');
  const canViewDetails = has('crm.service_packages.view_details');
  const canCreate = has('crm.service_packages.create');
  const canStatus = has('crm.service_packages.status');
  const canEdit = has('crm.service_packages.edit');
  const canDelete = has('crm.service_packages.delete');
  const showRowActions = canViewDetails || canStatus || canEdit || canDelete;
  return {
    loading,
    canViewPage,
    canViewDetails,
    canCreate,
    canStatus,
    canEdit,
    canDelete,
    showRowActions,
  };
}
