'use client';

import { WorkspaceShellSkeleton } from '@/components/loading/skeletons';
import { EmployeeDailyTasksWorkspace } from '@/features/employee/components/employee-daily-tasks-workspace';
import { useCanonicalWorkspaceRedirect } from '@/features/admin/navigation/use-canonical-workspace-redirect';

/** Self-service tasks; organization-workspace accounts are redirected to `/admin/daily-tasks`. */
export function EmployeeDailyTasksRoute() {
  const redirecting = useCanonicalWorkspaceRedirect();
  if (redirecting) return <WorkspaceShellSkeleton />;
  return <EmployeeDailyTasksWorkspace />;
}
