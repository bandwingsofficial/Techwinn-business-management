import type {
  DailyTaskBoardResponse,
  DailyTaskListItem,
  DailyTaskWorkflowStage,
} from '../types';

function resolveColumnStageId(
  workflowStageId: string | null | undefined,
  activeStageIds: ReadonlySet<string>,
  fallbackStageId: string | null,
): string | null {
  if (workflowStageId && activeStageIds.has(workflowStageId)) return workflowStageId;
  return fallbackStageId;
}

export function buildMyTaskBoard(input: {
  assignDate: string;
  stages: readonly DailyTaskWorkflowStage[];
  tasks: readonly DailyTaskListItem[];
}): DailyTaskBoardResponse {
  const activeStages = input.stages.filter((stage) => stage.isActive);
  const activeStageIds = new Set(activeStages.map((stage) => stage.id));
  const fallbackStageId =
    activeStages.find((stage) => stage.stageKey === 'todo')?.id ?? activeStages[0]?.id ?? null;

  const dateTasks = input.tasks.filter((task) => task.assignDate === input.assignDate);

  const columns = activeStages.map((stage) => ({
    stage: {
      id: stage.id,
      name: stage.name,
      sortOrder: stage.sortOrder,
      colorToken: stage.colorToken,
      columnKind: 'daily' as const,
      stageKey: stage.stageKey,
      isCompletedStage: stage.isCompletedStage,
    },
    tasks: dateTasks.filter(
      (task) =>
        resolveColumnStageId(task.workflowStageId, activeStageIds, fallbackStageId) === stage.id,
    ),
  }));

  const todo = columns.find((c) => c.stage.stageKey === 'todo')?.tasks.length ?? 0;
  const inProgress = columns.find((c) => c.stage.stageKey === 'in_progress')?.tasks.length ?? 0;
  const review = columns.find((c) => c.stage.stageKey === 'review')?.tasks.length ?? 0;
  const completed = dateTasks.filter((t) => t.completedAt).length;

  return {
    assignDate: input.assignDate,
    boardMode: 'daily',
    projectId: null,
    projectName: null,
    stages: activeStages,
    columns,
    projectBoards: [],
    projectTasksOverview: [],
    metrics: {
      total: dateTasks.length,
      todo,
      inProgress,
      review,
      completed,
      overdue: dateTasks.filter((t) => t.isOverdue).length,
    },
  };
}
