import type { DailyTaskWorkflowStage } from '../types';

/** Stable equality for workflow stage lists used to avoid effect-driven refetch loops. */
export function sameWorkflowStages(
  left: readonly DailyTaskWorkflowStage[],
  right: readonly DailyTaskWorkflowStage[],
): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every(
    (stage, index) =>
      stage.id === right[index]?.id &&
      stage.stageKey === right[index]?.stageKey &&
      stage.name === right[index]?.name &&
      stage.isActive === right[index]?.isActive &&
      stage.sortOrder === right[index]?.sortOrder,
  );
}
