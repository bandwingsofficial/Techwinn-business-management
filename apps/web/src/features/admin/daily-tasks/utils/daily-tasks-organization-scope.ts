import {
  PM_DAILY_TASKS_VIEW_KEY,
  type PermissionKey,
} from '@techwin/contracts';

/** Matches backend manage keys for assign/create/update/delete. */
const ORGANIZATION_DAILY_TASK_MANAGE_KEYS: readonly PermissionKey[] = [
  'tasks.create',
  'tasks.assign',
  'tasks.update',
  'tasks.delete',
  'project_management.daily_tasks.assign',
  'project_management.daily_tasks.edit',
  'project_management.daily_tasks.delete',
];

/**
 * Org-wide task board/calendar view.
 * Must stay aligned with `DailyTaskAuthorizationService.canViewOrganizationTasks`.
 * Employee self-service keys keep the account on own-task scope even with `projects.read`.
 */
export function canViewOrganizationDailyTasks(
  has: (key: PermissionKey) => boolean,
  hasAny: (...keys: PermissionKey[]) => boolean,
): boolean {
  if (has(PM_DAILY_TASKS_VIEW_KEY)) return true;
  if (hasAny(...ORGANIZATION_DAILY_TASK_MANAGE_KEYS)) return true;
  if (!has('tasks.read')) return false;
  if (hasAny('employees.view', 'leads.read', 'clients.read')) return true;
  // Project collaborators need both project and task view for organization task boards.
  if (has('projects.read') && has('tasks.read')) return true;
  if (hasAny('attendance.view_own', 'leave.requests.read_own', 'leave.balances.read_own')) {
    return false;
  }
  return false;
}

export type DailyTasksDataScope = 'team' | 'own';

export type DailyTasksPortal = 'admin' | 'employee';

/**
 * Resolves Kanban/list data scope from portal, URL, and trusted org-task visibility.
 * Organization viewers use the org list/board APIs — never `/daily-tasks/my` —
 * unless they explicitly open `?workspace=my`.
 */
export function resolveDailyTasksDataScope(input: {
  readonly portal: DailyTasksPortal;
  readonly workspaceParam: string | null;
  readonly explicitScope?: DailyTasksDataScope;
  readonly canViewOrganizationTasks: boolean;
  /** Personal `/daily-tasks/my` requires `tasks.read` (see API guard). */
  readonly hasTasksRead?: boolean;
}): DailyTasksDataScope {
  if (input.explicitScope) return input.explicitScope;

  const personalWorkspaceRequested = input.workspaceParam === 'my';
  const canUsePersonalApi = Boolean(input.hasTasksRead);

  if (personalWorkspaceRequested && canUsePersonalApi) {
    return 'own';
  }

  if (input.canViewOrganizationTasks) {
    return 'team';
  }

  if (input.portal === 'employee' || canUsePersonalApi) {
    return 'own';
  }

  return 'own';
}
