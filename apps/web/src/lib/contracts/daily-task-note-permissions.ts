import type { PermissionKey } from './permissions';
import { PM_DAILY_TASKS_VIEW_KEY } from './pm-daily-tasks-permissions';

export const DAILY_TASK_NOTE_CREATE_PERMISSIONS = [
  'daily_tasks.notes.create',
  'daily_tasks.comment',
  'tasks.comment',
] as const satisfies readonly PermissionKey[];

export const DAILY_TASK_NOTE_VIEW_OWN_PERMISSIONS = [
  'daily_tasks.notes.view_own',
  'daily_tasks.notes.view_all',
  'daily_tasks.notes.create',
  'daily_tasks.comment',
] as const satisfies readonly PermissionKey[];

export const DAILY_TASK_NOTE_VIEW_ALL_PERMISSIONS = [
  'daily_tasks.notes.view_all',
  'tasks.update',
  'tasks.create',
] as const satisfies readonly PermissionKey[];

export const DAILY_TASK_NOTE_ACKNOWLEDGE_PERMISSIONS = [
  'daily_tasks.notes.acknowledge',
  'tasks.update',
] as const satisfies readonly PermissionKey[];

export function hasDailyTaskNoteCreatePermission(
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  return DAILY_TASK_NOTE_CREATE_PERMISSIONS.some((key) => permissions.has(key));
}

export function hasDailyTaskNoteViewOwnPermission(
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  return DAILY_TASK_NOTE_VIEW_OWN_PERMISSIONS.some((key) => permissions.has(key));
}

export function hasDailyTaskNoteViewAllPermission(
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  return DAILY_TASK_NOTE_VIEW_ALL_PERMISSIONS.some((key) => permissions.has(key));
}

export function hasDailyTaskNoteAcknowledgePermission(
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  return DAILY_TASK_NOTE_ACKNOWLEDGE_PERMISSIONS.some((key) => permissions.has(key));
}

/**
 * Card-level Add Note visibility.
 * Uses platform identity only (`SUPER_ADMIN` vs org members), not org role labels or portal URL.
 */
export function canShowDailyTaskAddNoteButton(isPlatformSuperAdmin: boolean): boolean {
  return !isPlatformSuperAdmin;
}

/** Super Admin note review (Mark as Seen, inbox) — platform Super Admin only. */
export function isDailyTaskNotePlatformReviewer(isPlatformSuperAdmin: boolean): boolean {
  return isPlatformSuperAdmin;
}

/** Server-side note submission (assignment still enforced separately). */
export function hasDailyTaskNoteSubmitPermission(
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  if (hasDailyTaskNoteCreatePermission(permissions)) return true;
  return permissions.has(PM_DAILY_TASKS_VIEW_KEY) || permissions.has('tasks.read');
}
