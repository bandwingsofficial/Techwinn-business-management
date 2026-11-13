import type { PermissionKey } from './permissions.js';

/** Canonical CRM Pipeline permission keys (ordered for role editor display). */
export const CRM_PIPELINE_PERMISSION_KEYS = [
  'crm.pipeline.view',
  'crm.pipeline.create',
  'crm.pipeline.status',
  'crm.pipeline.edit',
  'crm.pipeline.delete',
  'crm.pipeline.import',
  'crm.pipeline.export',
  'crm.pipeline.bulk_delete',
] as const satisfies readonly PermissionKey[];

export type CrmPipelinePermissionKey = (typeof CRM_PIPELINE_PERMISSION_KEYS)[number];
