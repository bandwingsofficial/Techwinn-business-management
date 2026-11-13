import {
  PM_DAILY_TASKS_PERMISSION_KEYS,
  PM_DAILY_TASKS_VIEW_KEY,
  isPmDailyTasksPermissionKey,
  stripPmDailyTasksWithoutView,
} from './pm-daily-tasks-permissions.js';
import { PM_DAILY_TASKS_VIEW_PAGE_TOOLTIP } from './permission-pm-daily-tasks-tooltips.js';
import type { PermissionKey } from './permissions.js';

export { PM_DAILY_TASKS_VIEW_PAGE_TOOLTIP };

export function pmDailyTasksPermissionBlockedReason(
  key: PermissionKey,
  selected: ReadonlySet<PermissionKey>,
): string | null {
  if (!isPmDailyTasksPermissionKey(key)) return null;
  if (key === PM_DAILY_TASKS_VIEW_KEY) return null;
  if (!selected.has(PM_DAILY_TASKS_VIEW_KEY)) {
    return PM_DAILY_TASKS_VIEW_PAGE_TOOLTIP;
  }
  return null;
}

export function applyPmDailyTasksCrossPagePrerequisites(keys: Set<PermissionKey>): void {
  stripPmDailyTasksWithoutView(keys);
}
