import type { PermissionKey } from './permissions.js';

export const CRM_QUOTATIONS_PERMISSION_KEYS = [
  'crm.quotations.view',
  'crm.quotations.create',
  'crm.quotations.send',
  'crm.quotations.edit',
  'crm.quotations.delete',
] as const satisfies readonly PermissionKey[];

export type CrmQuotationsPermissionKey = (typeof CRM_QUOTATIONS_PERMISSION_KEYS)[number];

export const CRM_QUOTATIONS_VIEW_KEY =
  'crm.quotations.view' as const satisfies PermissionKey;

const CRM_QUOTATIONS_KEY_SET = new Set<string>(CRM_QUOTATIONS_PERMISSION_KEYS);

export function isCrmQuotationsPermissionKey(
  key: PermissionKey,
): key is CrmQuotationsPermissionKey {
  return CRM_QUOTATIONS_KEY_SET.has(key);
}

/** Maps legacy `leads.*` quotation page keys at runtime (does not affect Leads CRM keys). */
export function expandLegacyCrmQuotationsPermissions(keys: Set<PermissionKey>): void {
  if (keys.has('leads.read')) {
    if (!keys.has('crm.quotations.view')) keys.add('crm.quotations.view');
  }
  if (keys.has('leads.create')) {
    if (!keys.has('crm.quotations.create')) keys.add('crm.quotations.create');
  }
  if (keys.has('leads.update')) {
    if (!keys.has('crm.quotations.edit')) keys.add('crm.quotations.edit');
    if (!keys.has('crm.quotations.send')) keys.add('crm.quotations.send');
  }
  if (keys.has('leads.delete')) {
    if (!keys.has('crm.quotations.delete')) keys.add('crm.quotations.delete');
  }
}

export function stripQuotationsWithoutView(keys: Set<PermissionKey>): void {
  if (keys.has(CRM_QUOTATIONS_VIEW_KEY)) return;
  for (const key of CRM_QUOTATIONS_PERMISSION_KEYS) {
    keys.delete(key);
  }
}

export const QUOTATION_LIST = [CRM_QUOTATIONS_VIEW_KEY] as const satisfies readonly PermissionKey[];

export const QUOTATION_CREATE = [
  CRM_QUOTATIONS_VIEW_KEY,
  'crm.quotations.create',
] as const satisfies readonly PermissionKey[];

export const QUOTATION_UPDATE = [
  CRM_QUOTATIONS_VIEW_KEY,
  'crm.quotations.edit',
] as const satisfies readonly PermissionKey[];

export const QUOTATION_SEND = [
  CRM_QUOTATIONS_VIEW_KEY,
  'crm.quotations.send',
] as const satisfies readonly PermissionKey[];

export const QUOTATION_DELETE = [
  CRM_QUOTATIONS_VIEW_KEY,
  'crm.quotations.delete',
] as const satisfies readonly PermissionKey[];

export const QUOTATION_READ_DETAIL = [
  CRM_QUOTATIONS_VIEW_KEY,
  'crm.quotations.edit',
  'crm.quotations.send',
] as const satisfies readonly PermissionKey[];
