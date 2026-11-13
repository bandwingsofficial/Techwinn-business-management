import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';

export function usePipelinePagePermissions() {
  const { has } = useAdminAccess();
  return {
    canView: has('crm.pipeline.view'),
    canCreate: has('crm.pipeline.create'),
    canEdit: has('crm.pipeline.edit'),
    canChangeStatus: has('crm.pipeline.status'),
    canDelete: has('crm.pipeline.delete'),
    canImport: has('crm.pipeline.import'),
    canExport: has('crm.pipeline.export'),
    canBulkDelete: has('crm.pipeline.bulk_delete'),
    showBulkSelection: has('crm.pipeline.status') || has('crm.pipeline.bulk_delete'),
  };
}
