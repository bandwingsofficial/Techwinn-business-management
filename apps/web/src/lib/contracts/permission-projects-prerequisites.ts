import {
  PROJECTS_VIEW_KEY,
  PROJECT_PERMISSION_KEYS,
  isProjectsPermissionKey,
  stripProjectsWithoutView,
} from './projects-permissions';
import { PROJECTS_VIEW_PAGE_TOOLTIP } from './permission-projects-tooltips';
import type { PermissionKey } from './permissions';

export { PROJECTS_VIEW_PAGE_TOOLTIP };

export function projectsPermissionBlockedReason(
  key: PermissionKey,
  selected: ReadonlySet<PermissionKey>,
): string | null {
  if (!isProjectsPermissionKey(key)) return null;
  if (key === PROJECTS_VIEW_KEY) return null;
  if (!selected.has(PROJECTS_VIEW_KEY)) {
    return PROJECTS_VIEW_PAGE_TOOLTIP;
  }
  return null;
}

export function applyProjectsCrossPagePrerequisites(keys: Set<PermissionKey>): void {
  stripProjectsWithoutView(keys);
}

export function isProjectTasksPermissionKey(key: PermissionKey): boolean {
  return (
    key === 'tasks.read' ||
    key === 'tasks.create' ||
    key === 'tasks.update' ||
    key === 'tasks.delete' ||
    key === 'tasks.assign'
  );
}

const TASKS_VIEW_KEY = 'tasks.read' as const satisfies PermissionKey;

export function projectTasksPermissionBlockedReason(
  key: PermissionKey,
  selected: ReadonlySet<PermissionKey>,
): string | null {
  if (!isProjectTasksPermissionKey(key)) return null;
  if (key === TASKS_VIEW_KEY) return null;
  if (!selected.has(TASKS_VIEW_KEY)) {
    return 'Enable View Tasks before selecting other project task permissions.';
  }
  return null;
}

export function applyProjectTasksCrossPagePrerequisites(keys: Set<PermissionKey>): void {
  if (keys.has(TASKS_VIEW_KEY)) return;
  for (const key of ['tasks.create', 'tasks.update', 'tasks.delete', 'tasks.assign'] as const) {
    keys.delete(key);
  }
}

/** For hierarchy pages that list project keys only. */
export const PROJECTS_HIERARCHY_KEYS = PROJECT_PERMISSION_KEYS;