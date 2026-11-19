import type { ProjectListQuery } from '#validation';
import type { ProjectActor } from '../shared/project-actor.js';

export type ListProjectTaskSummariesQuery = {
  readonly actor: ProjectActor;
  readonly listQuery: ProjectListQuery;
  /** False → only projects/tasks assigned to `actor.adminId` are returned. */
  readonly organizationWide: boolean;
};
