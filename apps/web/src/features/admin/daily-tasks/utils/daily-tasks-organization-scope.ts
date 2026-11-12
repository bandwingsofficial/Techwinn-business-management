import type { PermissionKey } from '@techwin/contracts';

/** Matches backend manage keys for assign/create/update/delete. */
const ORGANIZATION_DAILY_TASK_MANAGE_KEYS: readonly PermissionKey[] = [
  'tasks.create',
  'tasks.assign',
  'tasks.update',
  'tasks.delete',
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
  if (hasAny(...ORGANIZATION_DAILY_TASK_MANAGE_KEYS)) return true;
  if (!has('tasks.read')) return false;
  if (hasAny('employees.read', 'leads.read', 'clients.read')) return true;
  // Project collaborators with Projects View + Tasks View get org boards even when
  // the same account also has employee self-service keys.
  if (has('projects.read')) return true;
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
}): DailyTasksDataScope {
  if (input.portal === 'employee') return 'own';
  if (input.workspaceParam === 'my') return 'own';
  if (input.explicitScope) return input.explicitScope;
  if (input.workspaceParam === 'team') {
    return input.canViewOrganizationTasks ? 'team' : 'own';
  }
  return input.canViewOrganizationTasks ? 'team' : 'own';
}
