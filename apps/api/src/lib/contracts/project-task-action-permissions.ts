import type { PermissionKey } from './permissions.js';

/**
 * Authoritative Project Tasks action → permission mapping.
 * Status, detail edits, and board moves share `tasks.update` (no separate status key).
 * Do not treat `projects.update` as authorization for task mutations.
 */
export const PROJECT_TASK_ACTION_PERMISSIONS = {
  view: 'tasks.read',
  create: 'tasks.create',
  /** Edit details, change status, drag/reorder, and move between phases. */
  update: 'tasks.update',
  assign: 'tasks.assign',
  delete: 'tasks.delete',
} as const satisfies Record<string, PermissionKey>;

export type ProjectTaskAction = keyof typeof PROJECT_TASK_ACTION_PERMISSIONS;
