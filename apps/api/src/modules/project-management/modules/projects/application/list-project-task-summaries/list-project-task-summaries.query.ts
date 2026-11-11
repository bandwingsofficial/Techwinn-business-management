import type { ProjectListQuery } from '#validation';
import type { ProjectActor } from '../shared/project-actor.js';

export type ListProjectTaskSummariesQuery = {
  readonly actor: ProjectActor;
  readonly listQuery: ProjectListQuery;
};
