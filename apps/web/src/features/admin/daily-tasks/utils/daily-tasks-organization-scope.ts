import {
  canViewOrganizationDailyTasks as canViewOrganizationDailyTasksRule,
  type PermissionKey,
} from '@techwin/contracts';

/**
 * Org-wide task board/calendar view (UI routing only — the API enforces the same shared rule).
 * `projects.read` + `tasks.read` alone stays on own-task scope.
 */
export function canViewOrganizationDailyTasks(has: (key: PermissionKey) => boolean): boolean {
  return canViewOrganizationDailyTasksRule(has);
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
