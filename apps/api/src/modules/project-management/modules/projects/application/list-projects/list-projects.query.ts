import type { ProjectListQuery } from '#validation';
import type { ProjectActor } from '../shared/project-actor.js';

export type ListProjectsQuery = {
  readonly actor: ProjectActor;
  readonly listQuery: ProjectListQuery;
};
