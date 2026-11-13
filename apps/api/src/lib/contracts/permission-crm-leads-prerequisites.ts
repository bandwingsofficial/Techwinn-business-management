import {
  CRM_LEADS_PIPELINE_TOOLTIP,
  CRM_LEADS_VIEW_TOOLTIP,
} from './permission-crm-leads-tooltips.js';
import {
  CRM_LEADS_VIEW_KEY,
  CRM_PIPELINE_VIEW_KEY,
  CRM_LEADS_PERMISSION_KEYS,
  isCrmLeadsPermissionKey,
  stripCrmLeadsWithoutPipelineView,
} from './crm-leads-permissions.js';
import type { PermissionKey } from './permissions.js';

export { CRM_LEADS_PIPELINE_TOOLTIP, CRM_LEADS_VIEW_TOOLTIP };

export function crmLeadsPermissionBlockedReason(
  key: PermissionKey,
  selected: ReadonlySet<PermissionKey>,
): string | null {
  if (!isCrmLeadsPermissionKey(key)) return null;
  if (!selected.has(CRM_PIPELINE_VIEW_KEY)) return CRM_LEADS_PIPELINE_TOOLTIP;
  if (key !== CRM_LEADS_VIEW_KEY && !selected.has(CRM_LEADS_VIEW_KEY)) {
    return CRM_LEADS_VIEW_TOOLTIP;
  }
  return null;
}

export function canSelectCrmLeadsPermissionKey(
  key: PermissionKey,
  selected: ReadonlySet<PermissionKey>,
): boolean {
  return crmLeadsPermissionBlockedReason(key, selected) === null;
}

export function applyCrmLeadsCrossPagePrerequisites(keys: Set<PermissionKey>): void {
  stripCrmLeadsWithoutPipelineView(keys);
}

export function crmLeadsPagePermissionKeys(): readonly PermissionKey[] {
  return CRM_LEADS_PERMISSION_KEYS;
}
