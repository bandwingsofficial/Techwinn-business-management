import type { PermissionKey } from '@techwin/contracts';
import {
  canAccessProjectPlanWorkspace,
  canAccessProjectProductionBoard,
  type ProjectWorkspaceLifecycle,
} from '@techwin/contracts';
import type { ProjectTaskSummaryItem } from '../types';

export function resolveProjectWorkspaceHref(
  project: ProjectTaskSummaryItem,
  permissionSet: ReadonlySet<PermissionKey>,
): string | null {
  const lifecycle = project.executionLifecycle as ProjectWorkspaceLifecycle;
  if (lifecycle === 'NOT_PLANNED' || lifecycle === 'PLANNED') {
    return canAccessProjectPlanWorkspace(lifecycle, permissionSet)
      ? `/admin/project-tasks/${project.id}/plan`
      : null;
  }
  if (lifecycle === 'IN_PRODUCTION' || lifecycle === 'COMPLETED') {
    return canAccessProjectProductionBoard(lifecycle, permissionSet)
      ? `/admin/project-tasks/${project.id}`
      : null;
  }
  return null;
}