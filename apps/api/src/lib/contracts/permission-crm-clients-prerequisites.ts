import {
  CRM_CLIENTS_PERMISSION_KEYS,
  CRM_CLIENTS_VIEW_KEY,
  isCrmClientsPermissionKey,
  stripCrmClientsWithoutView,
} from './crm-clients-permissions.js';
import { CRM_CLIENTS_VIEW_PAGE_TOOLTIP } from './permission-crm-clients-tooltips.js';
import type { PermissionKey } from './permissions.js';

export { CRM_CLIENTS_VIEW_PAGE_TOOLTIP };

export function crmClientsPermissionBlockedReason(
  key: PermissionKey,
  selected: ReadonlySet<PermissionKey>,
): string | null {
  if (!isCrmClientsPermissionKey(key)) return null;
  if (key === CRM_CLIENTS_VIEW_KEY) return null;
  if (!selected.has(CRM_CLIENTS_VIEW_KEY)) {
    return CRM_CLIENTS_VIEW_PAGE_TOOLTIP;
  }
  return null;
}

export function applyCrmClientsCrossPagePrerequisites(keys: Set<PermissionKey>): void {
  stripCrmClientsWithoutView(keys);
}
