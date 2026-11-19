import type { PermissionKey } from './permissions.js';
import { hasUnrestrictedOrgPermissions } from './org-access-unrestricted.js';
import { PM_DAILY_TASKS_VIEW_ALL_KEY, PM_DAILY_TASKS_VIEW_KEY } from './pm-daily-tasks-permissions.js';

/**
 * Task visibility rules shared by every task surface (daily list/board, project task board,
 * task calendar, dashboard). Accounts that do not pass the organization checks below only
 * ever see tasks assigned to their own employee profile.
 *
 * `projects.read`, `tasks.read`, Daily Tasks → View Page and collaborator keys such as
 * `employees.view` are deliberately not organization signals: roles hold them to open pages
 * and work on their own assignments. Organization-wide daily task visibility must be granted
 * explicitly (`project_management.daily_tasks.view_all`) or implied by task management keys.
 */

export const ORGANIZATION_DAILY_TASK_MANAGE_KEYS = [
  'tasks.create',
  'tasks.assign',
  'tasks.update',
  'tasks.delete',
  'project_management.daily_tasks.assign',
  'project_management.daily_tasks.edit',
  'project_management.daily_tasks.delete',
] as const satisfies readonly PermissionKey[];

export const ORGANIZATION_TASK_COLLABORATOR_KEYS = [
  'employees.view',
  'leads.read',
  'clients.read',
] as const satisfies readonly PermissionKey[];

const ORGANIZATION_PROJECT_TASK_MANAGE_KEYS = [
  'tasks.create',
  'tasks.assign',
  'tasks.update',
] as const satisfies readonly PermissionKey[];

type PermissionLookup = ReadonlySet<PermissionKey> | ((key: PermissionKey) => boolean);

function toHas(permissions: PermissionLookup): (key: PermissionKey) => boolean {
  return typeof permissions === 'function' ? permissions : (key) => permissions.has(key);
}

export function canManageOrganizationDailyTasks(
  permissions: PermissionLookup,
  isPlatformSuperAdmin = false,
): boolean {
  if (isPlatformSuperAdmin) return true;
  const has = toHas(permissions);
  return ORGANIZATION_DAILY_TASK_MANAGE_KEYS.some((key) => has(key));
}

/** Organization-wide daily task list, board, calendar rows and dashboard counts. */
export function canViewOrganizationDailyTasks(
  permissions: PermissionLookup,
  isPlatformSuperAdmin = false,
): boolean {
  if (isPlatformSuperAdmin) return true;
  const has = toHas(permissions);
  if (canManageOrganizationDailyTasks(has)) return true;
  return has(PM_DAILY_TASKS_VIEW_ALL_KEY);
}

/** Own assigned daily tasks (`/daily-tasks/my`, own calendar rows, own dashboard counts). */
export function canViewOwnDailyTasks(permissions: PermissionLookup): boolean {
  const has = toHas(permissions);
  return has('tasks.read') || has(PM_DAILY_TASKS_VIEW_KEY);
}

/** Every task on a project board / project calendar rows, not only the caller's assignments. */
export function canViewOrganizationProjectTasks(
  permissions: ReadonlySet<PermissionKey>,
  isPlatformSuperAdmin = false,
): boolean {
  if (isPlatformSuperAdmin) return true;
  if (!permissions.has('projects.read')) return false;
  if (hasUnrestrictedOrgPermissions(permissions)) return true;
  if (ORGANIZATION_PROJECT_TASK_MANAGE_KEYS.some((key) => permissions.has(key))) return true;
  return ORGANIZATION_TASK_COLLABORATOR_KEYS.some((key) => permissions.has(key));
}
