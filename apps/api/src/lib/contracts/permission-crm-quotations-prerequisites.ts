import {
  CRM_QUOTATIONS_PERMISSION_KEYS,
  CRM_QUOTATIONS_VIEW_KEY,
  isCrmQuotationsPermissionKey,
  stripQuotationsWithoutView,
} from './crm-quotations-permissions.js';
import { CRM_QUOTATIONS_VIEW_PAGE_TOOLTIP } from './permission-crm-quotations-tooltips.js';
import type { PermissionKey } from './permissions.js';

export { CRM_QUOTATIONS_VIEW_PAGE_TOOLTIP };

export function crmQuotationsPermissionBlockedReason(
  key: PermissionKey,
  selected: ReadonlySet<PermissionKey>,
): string | null {
  if (!isCrmQuotationsPermissionKey(key)) return null;
  if (key === CRM_QUOTATIONS_VIEW_KEY) return null;
  if (!selected.has(CRM_QUOTATIONS_VIEW_KEY)) {
    return CRM_QUOTATIONS_VIEW_PAGE_TOOLTIP;
  }
  return null;
}

export function canSelectCrmQuotationsPermissionKey(
  key: PermissionKey,
  selected: ReadonlySet<PermissionKey>,
): boolean {
  return crmQuotationsPermissionBlockedReason(key, selected) === null;
}

export function applyCrmQuotationsCrossPagePrerequisites(keys: Set<PermissionKey>): void {
  stripQuotationsWithoutView(keys);
}

export function crmQuotationsPagePermissionKeys(): readonly PermissionKey[] {
  return CRM_QUOTATIONS_PERMISSION_KEYS;
}
