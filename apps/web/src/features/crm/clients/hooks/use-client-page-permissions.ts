import { usePermissions } from '@/features/auth/components/permissions-provider';

export function useClientPagePermissions() {
  const { has, loading } = usePermissions();
  const canViewPage = has('crm.clients.view');
  const canCreate = has('crm.clients.create');
  const canViewDetails = has('crm.clients.view_details');
  const canStatus = has('crm.clients.status');
  const canEdit = has('crm.clients.edit');
  const canDelete = has('crm.clients.delete');
  const showRowActions =
    canViewDetails || canStatus || canEdit || canDelete;
  return {
    loading,
    canViewPage,
    canCreate,
    canViewDetails,
    canStatus,
    canEdit,
    canDelete,
    showRowActions,
  };
}
