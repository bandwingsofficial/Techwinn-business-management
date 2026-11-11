import type {
  DailyTaskWorkflowStageInput,
  DailyTaskWorkflowStageReassignmentInput,
} from '../../domain/types/daily-task-inputs.js';
import type { DailyTaskActor } from '../shared/daily-task-actor.js';

export type UpdateWorkflowStagesCommand = {
  readonly actor: DailyTaskActor;
  readonly stages: readonly DailyTaskWorkflowStageInput[];
  readonly reassignments?: readonly DailyTaskWorkflowStageReassignmentInput[];
};
