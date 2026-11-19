import type { ProjectActor } from '../shared/project-actor.js';

export type GetProjectTaskBoardQuery = {
  readonly actor: ProjectActor;
  readonly projectId: string;
  readonly planBaselineOnly?: boolean;
  /** False → the board only contains tasks assigned to `actor.adminId`. */
  readonly organizationWide: boolean;
};
