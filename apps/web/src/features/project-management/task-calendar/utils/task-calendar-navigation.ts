import type { TaskCalendarTaskDto } from '@techwin/contracts';

export function resolvePortalDailyTasksHref(
  portalSegment: string,
  mapAdminPath: (adminPath: string) => string,
  explicitBase?: string,
): string {
  if (explicitBase) return explicitBase;
  if (portalSegment === 'employee') return '/employee/daily-tasks';
  return mapAdminPath('/admin/daily-tasks');
}

export function resolvePortalProjectTaskHref(
  projectId: string,
  portalSegment: string,
  mapAdminPath: (adminPath: string) => string,
): string {
  if (portalSegment === 'employee') {
    return mapAdminPath(`/admin/project-tasks/${projectId}`);
  }
  return mapAdminPath(`/admin/project-tasks/${projectId}`);
}

export function resolveTaskCalendarNavigationHref(
  task: TaskCalendarTaskDto,
  options: {
    dailyTasksBasePath: string;
    projectTaskPath: (projectId: string) => string;
    /** Calendar day the user selected (falls back to task placement date). */
    calendarDate?: string;
  },
): string {
  const placementDate = options.calendarDate ?? task.assignDate;
  if (task.navigation.kind === 'daily_task') {
    const params = new URLSearchParams({
      date: placementDate,
      view: 'kanban',
      taskId: task.navigation.dailyTaskId,
      focus: 'board',
    });
    return `${options.dailyTasksBasePath}?${params.toString()}`;
  }
  const params = new URLSearchParams({
    taskId: task.navigation.projectTaskId,
    focus: 'board',
  });
  return `${options.projectTaskPath(task.navigation.projectId)}?${params.toString()}`;
}
