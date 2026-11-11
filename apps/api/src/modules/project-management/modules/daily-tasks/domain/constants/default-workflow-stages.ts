export const DEFAULT_DAILY_TASK_WORKFLOW_STAGES = [
  {
    stageKey: 'todo',
    name: 'To Do',
    sortOrder: 0,
    colorToken: '#64748b',
    isActive: true,
    isCompletedStage: false,
  },
  {
    stageKey: 'in_progress',
    name: 'In Progress',
    sortOrder: 1,
    colorToken: '#2563eb',
    isActive: true,
    isCompletedStage: false,
  },
  {
    stageKey: 'review',
    name: 'Review',
    sortOrder: 2,
    colorToken: '#ea580c',
    isActive: true,
    isCompletedStage: false,
  },
  {
    stageKey: 'completed',
    name: 'Completed',
    sortOrder: 3,
    colorToken: '#16a34a',
    isActive: true,
    isCompletedStage: true,
  },
] as const;
