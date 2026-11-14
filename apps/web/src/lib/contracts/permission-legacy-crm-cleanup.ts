import {
  CRM_CLIENTS_PERMISSION_KEYS,
  LEGACY_CLIENTS_PERMISSION_KEYS,
} from './crm-clients-permissions';
import {
  CRM_LEADS_PERMISSION_KEYS,
  CRM_PIPELINE_VIEW_KEY,
  LEGACY_LEADS_PERMISSION_KEYS,
} from './crm-leads-permissions';
import { CRM_QUOTATIONS_PERMISSION_KEYS } from './crm-quotations-permissions';
import type { PermissionKey } from './permissions';

function hasAny(keys: Set<PermissionKey>, candidates: readonly PermissionKey[]): boolean {
  return candidates.some((key) => keys.has(key));
}

/**
 * Removes deprecated CRM catalog keys that are hidden in Role Management but still
 * grant sidebar access via runtime legacy expansion (e.g. `leads.read` → quotations view).
 */
export function stripOrphanedLegacyCrmPermissionKeys(keys: Set<PermissionKey>): void {
  const hasGranularQuotations = hasAny(keys, CRM_QUOTATIONS_PERMISSION_KEYS);
  const hasGranularLeads = hasAny(keys, CRM_LEADS_PERMISSION_KEYS);
  const hasPipeline = keys.has(CRM_PIPELINE_VIEW_KEY);
  const legacyLeadsBundle =
    keys.has('leads.read') &&
    keys.has('leads.create') &&
    keys.has('leads.update') &&
    keys.has('leads.delete');

  if (!hasGranularQuotations && !hasGranularLeads && !hasPipeline && !legacyLeadsBundle) {
    for (const key of LEGACY_LEADS_PERMISSION_KEYS) keys.delete(key);
  }

  if (!hasAny(keys, CRM_CLIENTS_PERMISSION_KEYS)) {
    for (const key of LEGACY_CLIENTS_PERMISSION_KEYS) keys.delete(key);
  }

  if (hasGranularQuotations || hasGranularLeads) {
    for (const key of LEGACY_LEADS_PERMISSION_KEYS) keys.delete(key);
  }

  if (hasAny(keys, CRM_CLIENTS_PERMISSION_KEYS)) {
    for (const key of LEGACY_CLIENTS_PERMISSION_KEYS) keys.delete(key);
  }
}