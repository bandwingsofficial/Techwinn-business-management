import type { PermissionKey } from './permissions';

export const CRM_CLIENTS_PERMISSION_KEYS = [
  'crm.clients.view',
  'crm.clients.create',
  'crm.clients.view_details',
  'crm.clients.status',
  'crm.clients.edit',
  'crm.clients.delete',
] as const satisfies readonly PermissionKey[];

export type CrmClientsPermissionKey = (typeof CRM_CLIENTS_PERMISSION_KEYS)[number];

export const CRM_CLIENTS_VIEW_KEY = 'crm.clients.view' as const satisfies PermissionKey;

/** @deprecated Catalog keys kept for legacy role rows; excluded from role editor hierarchy. */
export const LEGACY_CLIENTS_PERMISSION_KEYS = [
  'clients.read',
  'clients.create',
  'clients.update',
  'clients.delete',
] as const satisfies readonly PermissionKey[];

const CRM_CLIENTS_KEY_SET = new Set<string>(CRM_CLIENTS_PERMISSION_KEYS);

export function isCrmClientsPermissionKey(key: PermissionKey): key is CrmClientsPermissionKey {
  return CRM_CLIENTS_KEY_SET.has(key);
}

export function expandLegacyCrmClientsPermissions(keys: Set<PermissionKey>): void {
  if (keys.has('clients.read')) {
    if (!keys.has('crm.clients.view')) keys.add('crm.clients.view');
    if (!keys.has('crm.clients.view_details')) keys.add('crm.clients.view_details');
  }
  if (keys.has('clients.create')) {
    if (!keys.has('crm.clients.create')) keys.add('crm.clients.create');
  }
  if (keys.has('clients.update')) {
    if (!keys.has('crm.clients.edit')) keys.add('crm.clients.edit');
    if (!keys.has('crm.clients.status')) keys.add('crm.clients.status');
  }
  if (keys.has('clients.delete')) {
    if (!keys.has('crm.clients.delete')) keys.add('crm.clients.delete');
  }
}

export function stripCrmClientsWithoutView(keys: Set<PermissionKey>): void {
  if (keys.has(CRM_CLIENTS_VIEW_KEY)) return;
  for (const key of CRM_CLIENTS_PERMISSION_KEYS) {
    keys.delete(key);
  }
}

export const CLIENT_LIST = [CRM_CLIENTS_VIEW_KEY] as const satisfies readonly PermissionKey[];

export const CLIENT_DETAIL = [
  CRM_CLIENTS_VIEW_KEY,
  'crm.clients.view_details',
] as const satisfies readonly PermissionKey[];

export const CLIENT_CREATE = [
  CRM_CLIENTS_VIEW_KEY,
  'crm.clients.create',
] as const satisfies readonly PermissionKey[];

export const CLIENT_UPDATE = [
  CRM_CLIENTS_VIEW_KEY,
  'crm.clients.edit',
] as const satisfies readonly PermissionKey[];

export const CLIENT_STATUS = [
  CRM_CLIENTS_VIEW_KEY,
  'crm.clients.status',
] as const satisfies readonly PermissionKey[];

export const CLIENT_DELETE = [
  CRM_CLIENTS_VIEW_KEY,
  'crm.clients.delete',
] as const satisfies readonly PermissionKey[];
