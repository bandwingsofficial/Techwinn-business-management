import {
  PROJECTS_VIEW_KEY,
  isProjectsPermissionKey,
  stripProjectsWithoutView,
} from './projects-permissions.js';
import type { PermissionKey } from './permissions.js';

export function applyProjectsCrossPagePrerequisites(keys: Set<PermissionKey>): void {
  stripProjectsWithoutView(keys);
}

export function applyProjectTasksCrossPagePrerequisites(keys: Set<PermissionKey>): void {
  if (keys.has('tasks.read')) return;
  for (const key of ['tasks.create', 'tasks.update', 'tasks.delete', 'tasks.assign'] as const) {
    keys.delete(key);
  }
}

export function isProjectsPermissionKeyForPrereq(key: PermissionKey): boolean {
  return isProjectsPermissionKey(key);
}