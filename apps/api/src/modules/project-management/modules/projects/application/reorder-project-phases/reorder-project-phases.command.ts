import type { ReorderProjectPhasesRequest } from '#validation';
import type { ProjectActor } from '../shared/project-actor.js';

export type ReorderProjectPhasesCommand = {
  readonly actor: ProjectActor;
  readonly projectId: string;
  readonly body: ReorderProjectPhasesRequest;
};
