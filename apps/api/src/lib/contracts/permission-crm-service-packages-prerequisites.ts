import {
  CRM_SERVICE_PACKAGES_PERMISSION_KEYS,
  CRM_SERVICE_PACKAGES_VIEW_KEY,
  isCrmServicePackagesPermissionKey,
  stripServicePackagesWithoutView,
} from './crm-service-packages-permissions.js';
import { CRM_SERVICE_PACKAGES_VIEW_PAGE_TOOLTIP } from './permission-crm-service-packages-tooltips.js';
import type { PermissionKey } from './permissions.js';

export { CRM_SERVICE_PACKAGES_VIEW_PAGE_TOOLTIP };

export function crmServicePackagesPermissionBlockedReason(
  key: PermissionKey,
  selected: ReadonlySet<PermissionKey>,
): string | null {
  if (!isCrmServicePackagesPermissionKey(key)) return null;
  if (key === CRM_SERVICE_PACKAGES_VIEW_KEY) return null;
  if (!selected.has(CRM_SERVICE_PACKAGES_VIEW_KEY)) {
    return CRM_SERVICE_PACKAGES_VIEW_PAGE_TOOLTIP;
  }
  return null;
}

export function applyCrmServicePackagesCrossPagePrerequisites(keys: Set<PermissionKey>): void {
  stripServicePackagesWithoutView(keys);
}
