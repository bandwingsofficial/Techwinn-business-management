import type { PermissionKey } from './permissions.js';

export const PROJECTS_VIEW_KEY = 'projects.read' as const satisfies PermissionKey;

export const PROJECT_PERMISSION_KEYS = [
  PROJECTS_VIEW_KEY,
  'projects.create',
  'projects.status',
  'projects.update',
  'projects.delete',
  'projects.plan.create',
  'projects.plan.edit',
  'projects.production.start',
  'projects.production.view',
  'projects.complete',
] as const satisfies readonly PermissionKey[];

export type ProjectsPermissionKey = (typeof PROJECT_PERMISSION_KEYS)[number];

const PROJECT_KEY_SET = new Set<string>(PROJECT_PERMISSION_KEYS);

export function isProjectsPermissionKey(key: PermissionKey): key is ProjectsPermissionKey {
  return PROJECT_KEY_SET.has(key);
}

export function expandLegacyProjectsPermissions(keys: Set<PermissionKey>): void {
  const ensureView = () => {
    if (!keys.has(PROJECTS_VIEW_KEY)) keys.add(PROJECTS_VIEW_KEY);
  };

  if (keys.has('projects.create')) ensureView();

  if (keys.has('projects.update')) {
    ensureView();
    const lifecycle: PermissionKey[] = [
      'projects.status',
      'projects.plan.create',
      'projects.plan.edit',
      'projects.production.start',
      'projects.production.view',
      'projects.complete',
    ];
    for (const key of lifecycle) {
      if (!keys.has(key)) keys.add(key);
    }
  }

  if (keys.has('projects.delete')) ensureView();
  for (const key of PROJECT_PERMISSION_KEYS) {
    if (key !== PROJECTS_VIEW_KEY && keys.has(key)) {
      ensureView();
      break;
    }
  }
}

export function stripProjectsWithoutView(keys: Set<PermissionKey>): void {
  if (keys.has(PROJECTS_VIEW_KEY)) return;
  for (const key of PROJECT_PERMISSION_KEYS) {
    keys.delete(key);
  }
}

export function hasProjectsViewPermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has(PROJECTS_VIEW_KEY);
}

export function hasProjectsCreatePermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('projects.create');
}

export function hasProjectsStatusPermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('projects.status');
}

export function hasProjectsEditPermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('projects.update');
}

export function hasProjectsDeletePermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('projects.delete');
}

export function hasProjectsPlanCreatePermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('projects.plan.create');
}

export function hasProjectsPlanEditPermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('projects.plan.edit');
}

export function hasProjectsProductionStartPermission(
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  return permissions.has('projects.production.start');
}

export function hasProjectsProductionViewPermission(
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  return permissions.has('projects.production.view');
}

export function hasProjectsCompletePermission(permissions: ReadonlySet<PermissionKey>): boolean {
  return permissions.has('projects.complete');
}

export type ProjectWorkspaceLifecycle =
  | 'NOT_PLANNED'
  | 'PLANNED'
  | 'IN_PRODUCTION'
  | 'COMPLETED';

export function canAccessProjectPlanWorkspace(
  lifecycle: ProjectWorkspaceLifecycle,
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  if (!hasProjectsViewPermission(permissions)) return false;
  if (lifecycle === 'NOT_PLANNED') return hasProjectsPlanCreatePermission(permissions);
  if (lifecycle === 'PLANNED') {
    return (
      hasProjectsPlanCreatePermission(permissions) || hasProjectsPlanEditPermission(permissions)
    );
  }
  return hasProjectsViewPermission(permissions);
}

export function canMutateProjectPlanWorkspace(
  lifecycle: ProjectWorkspaceLifecycle,
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  if (lifecycle === 'NOT_PLANNED') return hasProjectsPlanCreatePermission(permissions);
  if (lifecycle === 'PLANNED') return hasProjectsPlanEditPermission(permissions);
  return false;
}

export function canAccessProjectProductionBoard(
  lifecycle: ProjectWorkspaceLifecycle,
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  if (!hasProjectsViewPermission(permissions)) return false;
  if (lifecycle === 'IN_PRODUCTION') return hasProjectsProductionViewPermission(permissions);
  if (lifecycle === 'COMPLETED') return hasProjectsViewPermission(permissions);
  return false;
}

export function canAccessProjectTaskBoardApi(
  lifecycle: ProjectWorkspaceLifecycle,
  permissions: ReadonlySet<PermissionKey>,
): boolean {
  if (!hasProjectsViewPermission(permissions)) return false;
  if (lifecycle === 'NOT_PLANNED') return hasProjectsPlanCreatePermission(permissions);
  if (lifecycle === 'PLANNED') {
    return (
      hasProjectsPlanCreatePermission(permissions) || hasProjectsPlanEditPermission(permissions)
    );
  }
  if (lifecycle === 'IN_PRODUCTION') return hasProjectsProductionViewPermission(permissions);
  if (lifecycle === 'COMPLETED') return hasProjectsViewPermission(permissions);
  return false;
}

export const TASK_PERMISSION_KEYS = [
  'tasks.read',
  'tasks.create',
  'tasks.update',
  'tasks.delete',
  'tasks.assign',
] as const satisfies readonly PermissionKey[];