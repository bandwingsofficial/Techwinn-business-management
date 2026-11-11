import type { MoveProjectTaskRequest } from '#validation';
import type { ProjectActor } from '../shared/project-actor.js';

export type MoveProjectTaskCommand = {
  readonly actor: ProjectActor;
  readonly projectId: string;
  readonly taskId: string;
  readonly input: MoveProjectTaskRequest;
};
