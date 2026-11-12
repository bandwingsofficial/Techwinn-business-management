import type { PermissionKey } from './permissions';
import {
  PERMISSION_HIERARCHY,
  permissionDefinitionForKey,
  type PermissionHierarchyPage,
} from './permission-hierarchy';

function uniqueKeys(keys: readonly PermissionKey[]): PermissionKey[] {
  return [...new Set(keys)];
}

/** True when the catalog marks this key as a page View (read) action. */
export function isPermissionViewAction(key: PermissionKey): boolean {
  const action = permissionDefinitionForKey(key).action;
  return action === 'View' || action.startsWith('View ');
}

/** View keys declared on a hierarchy page (empty when the page is manage-only). */
export function pageViewPermissionKeys(page: PermissionHierarchyPage): PermissionKey[] {
  return uniqueKeys(page.permissionKeys).filter(isPermissionViewAction);
}

/** Non-view (action) keys on a hierarchy page. */
export function pageActionPermissionKeys(page: PermissionHierarchyPage): PermissionKey[] {
  return uniqueKeys(page.permissionKeys).filter((key) => !isPermissionViewAction(key));
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
 * Ensures every selected action key also includes its page View prerequisite(s).
 * Manage-only pages (no View key) are left unchanged.
 */
export function ensureViewPermissionPrerequisites(
  keys: readonly PermissionKey[],
): PermissionKey[] {
  const next = new Set(keys);
  for (const key of keys) {
    if (isPermissionViewAction(key)) continue;
    for (const page of pagesContainingKey(key)) {
      for (const viewKey of pageViewPermissionKeys(page)) {
        next.add(viewKey);
      }
    }
  }
  return [...next];
}

/**
 * Applies a checkbox change with View dependency rules:
 * - Enabling an action auto-selects that page's View key(s).
 * - Disabling View clears that page's dependent action keys when no View remains.
 */
export function applyPermissionKeyChange(
  selected: ReadonlySet<PermissionKey>,
  key: PermissionKey,
  checked: boolean,
  grantable?: ReadonlySet<PermissionKey>,
): PermissionKey[] {
  const next = new Set(selected);
  const allow = (candidate: PermissionKey) => !grantable || grantable.has(candidate);

  if (checked) {
    if (!allow(key)) return [...next];
    next.add(key);
    if (!isPermissionViewAction(key)) {
      for (const page of pagesContainingKey(key)) {
        for (const viewKey of pageViewPermissionKeys(page)) {
          if (allow(viewKey)) next.add(viewKey);
        }
      }
    }
    return [...next];
  }

  next.delete(key);
  if (isPermissionViewAction(key)) {
    for (const page of pagesContainingKey(key)) {
      const views = pageViewPermissionKeys(page);
      if (!views.includes(key)) continue;
      const anyViewLeft = views.some((viewKey) => next.has(viewKey));
      if (anyViewLeft) continue;
      for (const actionKey of pageActionPermissionKeys(page)) {
        next.delete(actionKey);
      }
    }
  }
  return [...next];
}

/**
 * Bulk select/clear for a page or module, preserving View dependency rules.
 */
export function applyPermissionKeysChecked(
  selected: ReadonlySet<PermissionKey>,
  keys: readonly PermissionKey[],
  checked: boolean,
  grantable?: ReadonlySet<PermissionKey>,
): PermissionKey[] {
  let next = new Set(selected);
  const ordered = checked ? keys : [...keys].reverse();
  for (const key of ordered) {
    if (grantable && !grantable.has(key)) continue;
    next = new Set(applyPermissionKeyChange(next, key, checked, grantable));
  }
  if (checked) {
    return ensureViewPermissionPrerequisites([...next]);
  }
  return [...next];
}
