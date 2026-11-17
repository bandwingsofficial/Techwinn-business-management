'use client';

import { canAccessTaskCalendar } from '@techwin/contracts';
import { TaskCalendarPage } from '@/features/project-management/task-calendar';
import { usePermissions } from '@/features/auth/components/permissions-provider';

/** Same URL (`/employee/task-calendar`) — organization vs self-service scope from permissions. */
export function EmployeeTaskCalendarRoute() {
  const { permissionSet } = usePermissions();
  const organizationScope = canAccessTaskCalendar(permissionSet);
  return (
    <TaskCalendarPage
      dataScope={organizationScope ? 'organization' : 'self'}
      dailyTasksBasePath="/employee/daily-tasks"
    />
  );
}
