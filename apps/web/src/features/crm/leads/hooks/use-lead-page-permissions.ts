import { usePermissions } from '@/features/auth/components/permissions-provider';

export function useLeadPagePermissions() {
  const { has, loading } = usePermissions();
  return {
    loading,
    canViewBoard: has('crm.leads.view'),
    canCreate: has('crm.leads.create'),
    canEdit: has('crm.leads.edit'),
    canMove: has('crm.leads.move'),
    canDelete: has('crm.leads.delete'),
    canImport: has('crm.leads.import'),
    canDragKanban: has('crm.leads.move'),
    showListBulkDelete: has('crm.leads.delete'),
  };
}
