import type { PermissionKey } from './permissions';
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
  return /\.read$/.test(key);
}

/** Single primary View key for a hierarchy page (empty when manage-only). */
export function pagePrimaryViewPermissionKey(page: PermissionHierarchyPage): PermissionKey | null {
  const keys = uniqueKeys(page.permissionKeys);
  const exactView = keys.find((key) => permissionDefinitionForKey(key).action === 'View');
  if (exactView) return exactView;
  const moduleRead = keys.find((key) => /\.read$/.test(key));
  if (moduleRead) return moduleRead;
  const moduleView = keys.find(isPermissionViewAction);
  if (moduleView) return moduleView;
  // Attendance-style pages: first catalog View* key is the page-access hint only.
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

function pagesContainingKey(key: PermissionKey): PermissionHierarchyPage[] {
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

/**
 * Persists the exact submitted set. View prerequisites are advisory in the editor;
 * they are not auto-granted here (avoids sibling auto-select / uncheck snap-back).
 */
export function ensureViewPermissionPrerequisites(
  keys: readonly PermissionKey[],
): PermissionKey[] {
  return uniqueKeys(keys);
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
  return `View is required to open: ${preview}${more}. Action permissions were kept; add View for those pages to grant page access.`;
}

/**
 * Independent checkbox change: exactly one permission key added or removed.
 * No sibling grants, no cascade clears.
 */
export function applyPermissionKeyChange(
  selected: ReadonlySet<PermissionKey>,
  key: PermissionKey,
  checked: boolean,
  grantable?: ReadonlySet<PermissionKey>,
): PermissionKey[] {
  const next = new Set(selected);
  const allow = !grantable || grantable.has(key);
  if (!allow) return [...next];
  if (checked) next.add(key);
  else next.delete(key);
  return [...next];
}

/**
 * Bulk select/clear for a page or module — only the listed keys, no View auto-fill.
 */
export function applyPermissionKeysChecked(
  selected: ReadonlySet<PermissionKey>,
  keys: readonly PermissionKey[],
  checked: boolean,
  grantable?: ReadonlySet<PermissionKey>,
): PermissionKey[] {
  const next = new Set(selected);
  for (const key of keys) {
    if (grantable && !grantable.has(key)) continue;
    if (checked) next.add(key);
    else next.delete(key);
  }
  return [...next];
}

/** @internal used by diagnostics */
export function pagesContainingPermissionKey(key: PermissionKey): PermissionHierarchyPage[] {
  return pagesContainingKey(key);
}
