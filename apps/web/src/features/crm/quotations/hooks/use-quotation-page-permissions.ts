import { usePermissions } from '@/features/auth/components/permissions-provider';

export function useQuotationPagePermissions() {
  const { has, loading } = usePermissions();
  const canViewPage = has('crm.quotations.view');
  const canCreate = has('crm.quotations.create');
  const canSend = has('crm.quotations.send');
  const canEdit = has('crm.quotations.edit');
  const canDelete = has('crm.quotations.delete');
  const showRowActions = canSend || canEdit || canDelete;
  return {
    loading,
    canViewPage,
    canCreate,
    canSend,
    canEdit,
    canDelete,
    showRowActions,
  };
}
