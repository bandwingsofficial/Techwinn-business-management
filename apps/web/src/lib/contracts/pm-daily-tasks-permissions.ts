import type { PermissionKey } from './permissions';

export const PM_DAILY_TASKS_PERMISSION_KEYS = [
  'project_management.daily_tasks.view',
  'project_management.daily_tasks.assign',
  'project_management.daily_tasks.view_details',
  'project_management.daily_tasks.edit',
  'project_management.daily_tasks.delete',
  'project_management.daily_tasks.move',
] as const satisfies readonly PermissionKey[];

export type PmDailyTasksPermissionKey = (typeof PM_DAILY_TASKS_PERMISSION_KEYS)[number];

export const PM_DAILY_TASKS_VIEW_KEY =
  'project_management.daily_tasks.view' as const satisfies PermissionKey;

const PM_DAILY_TASKS_KEY_SET = new Set<string>(PM_DAILY_TASKS_PERMISSION_KEYS);

export function isPmDailyTasksPermissionKey(key: PermissionKey): key is PmDailyTasksPermissionKey {
  return PM_DAILY_TASKS_KEY_SET.has(key);
}

/** Org-admin daily task board keys not shown on the six-permission role page. */
export const DAILY_TASKS_AUXILIARY_PERMISSION_KEYS = [
  'daily_tasks.update_status',
  'daily_tasks.comment',
  'daily_tasks.manage_workflow',
  'daily_tasks.notes.create',
  'daily_tasks.notes.view_own',
  'daily_tasks.notes.view_all',
  'daily_tasks.notes.acknowledge',
  'tasks.progress',
  'tasks.comment',
] as const satisfies readonly PermissionKey[];

const ORG_DAILY_TASKS_READ_COLLABORATOR_KEYS = [
  'tasks.create',
  'tasks.assign',
  'tasks.update',
  'tasks.delete',
  'projects.read',
  'employees.read',
  'leads.read',
  'clients.read',
  'daily_tasks.manage_workflow',
] as const satisfies readonly PermissionKey[];

export function expandLegacyPmDailyTasksPermissions(keys: Set<PermissionKey>): void {
  const ensureViewPage = () => {
    if (!keys.has(PM_DAILY_TASKS_VIEW_KEY)) keys.add(PM_DAILY_TASKS_VIEW_KEY);
  };

  if (
    keys.has('tasks.read') &&
    ORG_DAILY_TASKS_READ_COLLABORATOR_KEYS.some((key) => keys.has(key))
  ) {
    ensureViewPage();
  }

  if (keys.has('tasks.create') || keys.has('tasks.assign')) {
    ensureViewPage();
    if (!keys.has('project_management.daily_tasks.assign')) {
      keys.add('project_management.daily_tasks.assign');
    }
  }
  if (keys.has('tasks.update')) {
    ensureViewPage();
    if (!keys.has('project_management.daily_tasks.edit')) {
      keys.add('project_management.daily_tasks.edit');
    }
  }
  if (keys.has('tasks.delete')) {
    ensureViewPage();
    if (!keys.has('project_management.daily_tasks.delete')) {
      keys.add('project_management.daily_tasks.delete');
    }
  }
  if (keys.has('daily_tasks.update_status') || keys.has('tasks.progress')) {
    ensureViewPage();
    if (!keys.has('project_management.daily_tasks.move')) {
      keys.add('project_management.daily_tasks.move');
    }
  }

  if (keys.has('tasks.read')) {
    const orgWide =
      ORG_DAILY_TASKS_READ_COLLABORATOR_KEYS.some((key) => keys.has(key)) ||
      keys.has('daily_tasks.notes.view_all');
    if (!orgWide) {
      if (!keys.has('daily_tasks.notes.create')) keys.add('daily_tasks.notes.create');
      if (!keys.has('daily_tasks.notes.view_own')) keys.add('daily_tasks.notes.view_own');
    }
  }

  if (keys.has(PM_DAILY_TASKS_VIEW_KEY)) {
    const orgWideNoteReader =
      ORG_DAILY_TASKS_READ_COLLABORATOR_KEYS.some((key) => keys.has(key)) ||
      keys.has('daily_tasks.notes.view_all') ||
      keys.has('tasks.update') ||
      keys.has('tasks.create');
    if (!orgWideNoteReader) {
      if (!keys.has('daily_tasks.notes.create')) keys.add('daily_tasks.notes.create');
      if (!keys.has('daily_tasks.notes.view_own')) keys.add('daily_tasks.notes.view_own');
    }
  }

  for (const key of PM_DAILY_TASKS_PERMISSION_KEYS) {
    if (key !== PM_DAILY_TASKS_VIEW_KEY && keys.has(key)) {
      ensureViewPage();
      break;
    }
  }
}

export function stripPmDailyTasksWithoutView(keys: Set<PermissionKey>): void {
  if (keys.has(PM_DAILY_TASKS_VIEW_KEY)) return;
  for (const key of PM_DAILY_TASKS_PERMISSION_KEYS) {
    keys.delete(key);
  }
}

export const PM_DAILY_TASK_LIST = [PM_DAILY_TASKS_VIEW_KEY] as const satisfies readonly PermissionKey[];

export const PM_DAILY_TASK_DETAIL = [
  PM_DAILY_TASKS_VIEW_KEY,
  'project_management.daily_tasks.view_details',
] as const satisfies readonly PermissionKey[];

export const PM_DAILY_TASK_ASSIGN = [
  PM_DAILY_TASKS_VIEW_KEY,
  'project_management.daily_tasks.assign',
] as const satisfies readonly PermissionKey[];

export const PM_DAILY_TASK_EDIT = [
  PM_DAILY_TASKS_VIEW_KEY,
  'project_management.daily_tasks.edit',
] as const satisfies readonly PermissionKey[];

export const PM_DAILY_TASK_DELETE = [
  PM_DAILY_TASKS_VIEW_KEY,
  'project_management.daily_tasks.delete',
] as const satisfies readonly PermissionKey[];

export const PM_DAILY_TASK_MOVE = [
  PM_DAILY_TASKS_VIEW_KEY,
  'project_management.daily_tasks.move',
] as const satisfies readonly PermissionKey[];

export function hasPmDailyTaskMovePermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return (
    permissions.has('project_management.daily_tasks.move') ||
    permissions.has('daily_tasks.update_status') ||
    permissions.has('tasks.progress')
  );
}

export function hasPmDailyTaskAssignPermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return (
    permissions.has('project_management.daily_tasks.assign') ||
    permissions.has('tasks.create') ||
    permissions.has('tasks.assign')
  );
}

export function hasPmDailyTaskViewDetailsPermission(
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  return permissions.has('project_management.daily_tasks.view_details');
}

export function hasPmDailyTaskEditPermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return (
    permissions.has('project_management.daily_tasks.edit') || permissions.has('tasks.update')
  );
}

export function hasPmDailyTaskDeletePermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return (
    permissions.has('project_management.daily_tasks.delete') || permissions.has('tasks.delete')
  );
}

export function hasPmDailyTaskViewPagePermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has(PM_DAILY_TASKS_VIEW_KEY);
}
