import type { PermissionKey } from './permissions';
import {
  CRM_PIPELINE_VIEW_KEY,
  CRM_LEADS_PERMISSION_KEYS,
  isCrmLeadsPermissionKey,
} from './crm-leads-permissions';
import { applyCrmLeadsCrossPagePrerequisites } from './permission-crm-leads-prerequisites';
import { applyCrmServicePackagesCrossPagePrerequisites } from './permission-crm-service-packages-prerequisites';
import { applyCrmQuotationsCrossPagePrerequisites } from './permission-crm-quotations-prerequisites';
import {
  PERMISSION_HIERARCHY,
  permissionDefinitionForKey,
  type PermissionHierarchyPage,
} from './permission-hierarchy';

function uniqueKeys(keys: readonly PermissionKey[]): PermissionKey[] {
  return [...new Set(keys)];
}

/**
 * Primary page-access View keys only.
 * Does not treat "View all", "View own", "View summary", notes views, etc. as
 * automatic prerequisites — those remain independently selectable.
 */
export function isPermissionViewAction(key: PermissionKey): boolean {
  const action = permissionDefinitionForKey(key).action;
  if (action === 'View') return true;
  if (action === 'View inbox') return true;
  if (/^View [A-Za-z]/.test(action) && !/\b(all|own|summary|audit|compensation|task notes)\b/i.test(action)) {
    return true;
  }
  return /\.read$/.test(key) || /^crm\.[a-z]+\.view$/.test(key);
}

/** Single primary View key for a hierarchy page (empty when manage-only). */
export function pagePrimaryViewPermissionKey(page: PermissionHierarchyPage): PermissionKey | null {
  const keys = uniqueKeys(page.permissionKeys);
  const viewPage = keys.find((key) => permissionDefinitionForKey(key).action === 'View Page');
  if (viewPage) return viewPage;
  const exactView = keys.find((key) => permissionDefinitionForKey(key).action === 'View');
  if (exactView) return exactView;
  const moduleRead = keys.find((key) => /\.read$/.test(key));
  if (moduleRead) return moduleRead;
  const moduleView = keys.find(isPermissionViewAction);
  if (moduleView) return moduleView;
  const scopedView = keys.find((key) => {
    const action = permissionDefinitionForKey(key).action;
    return action === 'View' || action.startsWith('View ');
  });
  return scopedView ?? null;
}

/** View keys declared on a hierarchy page (primary access only). */
export function pageViewPermissionKeys(page: PermissionHierarchyPage): PermissionKey[] {
  const primary = pagePrimaryViewPermissionKey(page);
  return primary ? [primary] : [];
}

/** Non-view (action) keys on a hierarchy page. */
export function pageActionPermissionKeys(page: PermissionHierarchyPage): PermissionKey[] {
  const primary = pagePrimaryViewPermissionKey(page);
  return uniqueKeys(page.permissionKeys).filter((key) => key !== primary);
}

function findHierarchyPagesForPermissionKey(key: PermissionKey): PermissionHierarchyPage[] {
  const pages: PermissionHierarchyPage[] = [];
  for (const mod of PERMISSION_HIERARCHY) {
    for (const group of mod.groups) {
      for (const page of group.pages) {
        if (page.permissionKeys.includes(key)) pages.push(page);
      }
    }
  }
  return pages;
}

function stripActionPermissionsWithoutView(keys: Set<PermissionKey>): void {
  for (const mod of PERMISSION_HIERARCHY) {
    for (const group of mod.groups) {
      for (const page of group.pages) {
        const viewKey = pagePrimaryViewPermissionKey(page);
        if (!viewKey || keys.has(viewKey)) continue;
        for (const pageKey of page.permissionKeys) {
          if (pageKey !== viewKey) keys.delete(pageKey);
        }
      }
    }
  }
}

/**
 * Persists only valid page selections: action keys require the page View key.
 */
export function ensureViewPermissionPrerequisites(
  keys: readonly PermissionKey[],
): PermissionKey[] {
  const next = new Set(uniqueKeys(keys));
  stripActionPermissionsWithoutView(next);
  applyCrmLeadsCrossPagePrerequisites(next);
  applyCrmServicePackagesCrossPagePrerequisites(next);
  applyCrmQuotationsCrossPagePrerequisites(next);
  return [...next];
}

/** View prerequisites plus CRM Leads cross-page rules (Pipeline View). */
export function ensurePermissionPrerequisites(keys: readonly PermissionKey[]): PermissionKey[] {
  return ensureViewPermissionPrerequisites(keys);
}

export type MissingViewPrerequisite = {
  readonly pageLabel: string;
  readonly actionKey: PermissionKey;
  readonly viewKey: PermissionKey;
};

/** Pages where an action is selected but the primary View key is not. */
export function findMissingViewPrerequisites(
  keys: readonly PermissionKey[],
): readonly MissingViewPrerequisite[] {
  const selected = new Set(keys);
  const missing: MissingViewPrerequisite[] = [];
  const seen = new Set<string>();

  for (const mod of PERMISSION_HIERARCHY) {
    for (const group of mod.groups) {
      for (const page of group.pages) {
        const viewKey = pagePrimaryViewPermissionKey(page);
        if (!viewKey || selected.has(viewKey)) continue;
        for (const actionKey of pageActionPermissionKeys(page)) {
          if (!selected.has(actionKey)) continue;
          const dedupe = `${page.id}:${actionKey}:${viewKey}`;
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);
          missing.push({ pageLabel: page.label, actionKey, viewKey });
        }
      }
    }
  }

  return missing;
}

export function describeMissingViewPrerequisites(keys: readonly PermissionKey[]): string | null {
  const missing = findMissingViewPrerequisites(keys);
  if (missing.length === 0) return null;
  const pages = [...new Set(missing.map((row) => row.pageLabel))];
  const preview = pages.slice(0, 3).join(', ');
  const more = pages.length > 3 ? ` +${pages.length - 3} more` : '';
  return `View is required for: ${preview}${more}. Select View before saving action permissions.`;
}

/**
 * Toggle one permission key. Unchecking View clears that page's action keys.
 * Action keys cannot be selected without View.
 */
export function applyPermissionKeyChange(
  selected: ReadonlySet<PermissionKey>,
  key: PermissionKey,
  checked: boolean,
  grantable?: ReadonlySet<PermissionKey>,
): PermissionKey[] {
  if (grantable && !grantable.has(key)) return [...selected];
  const pages = findHierarchyPagesForPermissionKey(key);
  const next = new Set(selected);

  if (checked) {
    if (isCrmLeadsPermissionKey(key) && !next.has(CRM_PIPELINE_VIEW_KEY)) {
      return [...selected];
    }
    for (const page of pages) {
      const viewKey = pagePrimaryViewPermissionKey(page);
      if (viewKey && key !== viewKey && !next.has(viewKey)) {
        return [...selected];
      }
    }
    next.add(key);
    return [...next];
  }

  next.delete(key);
  if (key === CRM_PIPELINE_VIEW_KEY) {
    for (const leadsKey of CRM_LEADS_PERMISSION_KEYS) next.delete(leadsKey);
  }
  for (const page of pages) {
    const viewKey = pagePrimaryViewPermissionKey(page);
    if (viewKey && key === viewKey) {
      for (const pageKey of page.permissionKeys) next.delete(pageKey);
    }
  }
  applyCrmLeadsCrossPagePrerequisites(next);
  applyCrmServicePackagesCrossPagePrerequisites(next);
  applyCrmQuotationsCrossPagePrerequisites(next);
  return [...next];
}

/** Bulk select/clear for a page or module — only the listed keys. */
export function applyPermissionKeysChecked(
  selected: ReadonlySet<PermissionKey>,
  keys: readonly PermissionKey[],
  checked: boolean,
  grantable?: ReadonlySet<PermissionKey>,
): PermissionKey[] {
  let next = new Set(selected);
  for (const key of keys) {
    if (grantable && !grantable.has(key)) continue;
    next = new Set(applyPermissionKeyChange(next, key, checked, grantable));
  }
  stripActionPermissionsWithoutView(next);
  applyCrmLeadsCrossPagePrerequisites(next);
  applyCrmServicePackagesCrossPagePrerequisites(next);
  applyCrmQuotationsCrossPagePrerequisites(next);
  return [...next];
}

/** @internal used by diagnostics */
export function pagesContainingPermissionKey(key: PermissionKey): PermissionHierarchyPage[] {
  return findHierarchyPagesForPermissionKey(key);
}
