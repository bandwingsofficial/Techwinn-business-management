import type { ProjectActor } from '../shared/project-actor.js';

export type CheckProjectNumberAvailabilityQuery = {
  readonly actor: ProjectActor;
  readonly projectNumber: string;
  readonly excludeProjectId?: string;
};