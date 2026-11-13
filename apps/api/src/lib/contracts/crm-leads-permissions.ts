import type { PermissionKey } from './permissions.js';

/** Canonical CRM Leads permission keys (ordered for role editor display). */
export const CRM_LEADS_PERMISSION_KEYS = [
  'crm.leads.view',
  'crm.leads.create',
  'crm.leads.edit',
  'crm.leads.move',
  'crm.leads.delete',
  'crm.leads.import',
] as const satisfies readonly PermissionKey[];

export type CrmLeadsPermissionKey = (typeof CRM_LEADS_PERMISSION_KEYS)[number];

export const CRM_LEADS_VIEW_KEY = 'crm.leads.view' as const satisfies PermissionKey;
export const CRM_PIPELINE_VIEW_KEY = 'crm.pipeline.view' as const satisfies PermissionKey;

const CRM_LEADS_KEY_SET = new Set<string>(CRM_LEADS_PERMISSION_KEYS);

export function isCrmLeadsPermissionKey(key: PermissionKey): key is CrmLeadsPermissionKey {
  return CRM_LEADS_KEY_SET.has(key);
}

/**
 * Expands legacy `leads.*` page bundle into `crm.leads.*` for roles that held the
 * full legacy Leads page set. Leaves quotation-only `leads.read` roles unchanged.
 */
export function expandLegacyCrmLeadsPermissions(keys: Set<PermissionKey>): void {
  const hasLegacyBundle =
    keys.has('leads.read') &&
    keys.has('leads.create') &&
    keys.has('leads.update') &&
    keys.has('leads.delete');
  if (!hasLegacyBundle) return;

  if (!keys.has('crm.leads.view')) keys.add('crm.leads.view');
  if (!keys.has('crm.leads.create')) keys.add('crm.leads.create');
  if (!keys.has('crm.leads.edit')) keys.add('crm.leads.edit');
  if (!keys.has('crm.leads.move')) keys.add('crm.leads.move');
  if (!keys.has('crm.leads.delete')) keys.add('crm.leads.delete');
  if (!keys.has('crm.leads.import') && keys.has('leads.create')) {
    keys.add('crm.leads.import');
  }
}

export function stripCrmLeadsWithoutPipelineView(keys: Set<PermissionKey>): void {
  if (keys.has(CRM_PIPELINE_VIEW_KEY)) return;
  for (const key of CRM_LEADS_PERMISSION_KEYS) {
    keys.delete(key);
  }
}
