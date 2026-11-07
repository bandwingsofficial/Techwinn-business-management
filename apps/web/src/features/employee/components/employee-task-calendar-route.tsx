'use client';

import { WorkspaceShellSkeleton } from '@/components/loading/skeletons';
import { TaskCalendarPage } from '@/features/project-management/task-calendar';
import { useCanonicalWorkspaceRedirect } from '@/features/admin/navigation/use-canonical-workspace-redirect';

/** Self-service calendar; organization-workspace accounts are redirected to `/admin/task-calendar`. */
export function EmployeeTaskCalendarRoute() {
  const redirecting = useCanonicalWorkspaceRedirect();
  if (redirecting) return <WorkspaceShellSkeleton />;
  return <TaskCalendarPage dataScope="self" dailyTasksBasePath="/employee/daily-tasks" />;
}
