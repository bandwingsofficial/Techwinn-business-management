import type { PermissionKey } from './permissions';

export const CRM_SERVICE_PACKAGES_PERMISSION_KEYS = [
  'crm.service_packages.view',
  'crm.service_packages.view_details',
  'crm.service_packages.create',
  'crm.service_packages.status',
  'crm.service_packages.edit',
  'crm.service_packages.delete',
] as const satisfies readonly PermissionKey[];

export type CrmServicePackagesPermissionKey =
  (typeof CRM_SERVICE_PACKAGES_PERMISSION_KEYS)[number];

export const CRM_SERVICE_PACKAGES_VIEW_KEY =
  'crm.service_packages.view' as const satisfies PermissionKey;

const CRM_SERVICE_PACKAGES_KEY_SET = new Set<string>(CRM_SERVICE_PACKAGES_PERMISSION_KEYS);

export function isCrmServicePackagesPermissionKey(
  key: PermissionKey,
): key is CrmServicePackagesPermissionKey {
  return CRM_SERVICE_PACKAGES_KEY_SET.has(key);
}

/** Maps legacy Settings permissions to granular Service Packages keys (runtime only). */
export function expandLegacyServicePackagePermissions(keys: Set<PermissionKey>): void {
  if (keys.has('settings.read')) {
    if (!keys.has('crm.service_packages.view')) keys.add('crm.service_packages.view');
    if (!keys.has('crm.service_packages.view_details')) {
      keys.add('crm.service_packages.view_details');
    }
  }
  if (keys.has('settings.manage')) {
    for (const key of [
      'crm.service_packages.create',
      'crm.service_packages.status',
      'crm.service_packages.edit',
      'crm.service_packages.delete',
    ] as const satisfies readonly PermissionKey[]) {
      if (!keys.has(key)) keys.add(key);
    }
  }
}

export function stripServicePackagesWithoutView(keys: Set<PermissionKey>): void {
  if (keys.has(CRM_SERVICE_PACKAGES_VIEW_KEY)) return;
  for (const key of CRM_SERVICE_PACKAGES_PERMISSION_KEYS) {
    keys.delete(key);
  }
}

export const SERVICE_PACKAGE_LIST = [
  CRM_SERVICE_PACKAGES_VIEW_KEY,
] as const satisfies readonly PermissionKey[];

export const SERVICE_PACKAGE_DETAIL = [
  CRM_SERVICE_PACKAGES_VIEW_KEY,
  'crm.service_packages.view_details',
] as const satisfies readonly PermissionKey[];

export const SERVICE_PACKAGE_CREATE = [
  CRM_SERVICE_PACKAGES_VIEW_KEY,
  'crm.service_packages.create',
] as const satisfies readonly PermissionKey[];

export const SERVICE_PACKAGE_UPDATE = [
  CRM_SERVICE_PACKAGES_VIEW_KEY,
  'crm.service_packages.edit',
] as const satisfies readonly PermissionKey[];

export const SERVICE_PACKAGE_STATUS = [
  CRM_SERVICE_PACKAGES_VIEW_KEY,
  'crm.service_packages.status',
] as const satisfies readonly PermissionKey[];

export const SERVICE_PACKAGE_DELETE = [
  CRM_SERVICE_PACKAGES_VIEW_KEY,
  'crm.service_packages.delete',
] as const satisfies readonly PermissionKey[];
