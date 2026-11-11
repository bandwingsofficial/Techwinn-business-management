import type { SaveProjectPlanRequest } from '#validation';
import type { ProjectActor } from '../shared/project-actor.js';

export type SaveProjectPlanCommand = {
  readonly actor: ProjectActor;
  readonly projectId: string;
  readonly body: SaveProjectPlanRequest;
};
