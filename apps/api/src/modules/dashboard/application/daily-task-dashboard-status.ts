import type { Prisma } from '../../../generated/prisma/client.js';

export type DailyTaskStatusBucket =
  | 'completed'
  | 'overdue'
  | 'in_progress'
  | 'pending'
  | 'not_started';

const BUCKET_ORDER: readonly DailyTaskStatusBucket[] = [
  'completed',
  'overdue',
  'in_progress',
  'pending',
  'not_started',
];

export const DAILY_TASK_STATUS_CHART_LABELS: Record<DailyTaskStatusBucket, string> = {
  completed: 'Completed',
  overdue: 'Overdue',
  in_progress: 'In Progress',
  pending: 'Pending',
  not_started: 'Not Started',
};

/** Open tasks: not on a completed workflow stage. */
export function dailyTaskOpenWhere(
  completedStageIds: readonly string[],
): Prisma.DailyTaskWhereInput {
  if (completedStageIds.length === 0) {
    return { workflowStageId: null };
  }
  return {
    OR: [{ workflowStageId: null }, { workflowStageId: { notIn: [...completedStageIds] } }],
  };
}

/**
 * Mutually exclusive buckets for dashboard status distribution.
 * Overdue takes precedence over in-progress when due date is before today.
 */
export function dailyTaskStatusWhere(
  bucket: DailyTaskStatusBucket,
  completedStageIds: readonly string[],
  today: Date,
): Prisma.DailyTaskWhereInput {
  if (bucket === 'completed') {
    if (completedStageIds.length === 0) {
      return { id: { in: [] } };
    }
    return { workflowStageId: { in: [...completedStageIds] } };
  }

  const open = dailyTaskOpenWhere(completedStageIds);
  switch (bucket) {
    case 'overdue':
      return { AND: [open, { dueDate: { lt: today } }] };
    case 'in_progress':
      return {
        AND: [
          open,
          { workflowStageId: { not: null } },
          { OR: [{ dueDate: null }, { dueDate: { gte: today } }] },
        ],
      };
    case 'pending':
      return {
        AND: [open, { workflowStageId: null }, { dueDate: { gte: today } }],
      };
    case 'not_started':
      return { AND: [open, { workflowStageId: null }, { dueDate: null }] };
    default:
      return { id: { in: [] } };
  }
}

export function dailyTaskStatusBucketOrder(): readonly DailyTaskStatusBucket[] {
  return BUCKET_ORDER;
}