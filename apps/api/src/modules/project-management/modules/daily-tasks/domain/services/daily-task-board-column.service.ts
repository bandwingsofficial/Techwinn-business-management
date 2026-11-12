/**
 * Maps a task onto an active Kanban column.
 * Tasks whose workflow stage is missing or inactive fall back to the default column
 * so they remain visible for the selected assign date (same visibility as calendar).
 */
export function resolveDailyTaskBoardColumnStageId(
  workflowStageId: string | null | undefined,
  activeStageIds: ReadonlySet<string>,
  fallbackStageId: string | null,
): string | null {
  if (workflowStageId && activeStageIds.has(workflowStageId)) {
    return workflowStageId;
  }
  return fallbackStageId;
}
