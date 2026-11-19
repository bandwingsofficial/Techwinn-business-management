import type { OrgAccessActor } from '../../../../../org-access/application/shared/org-access-actor.js';

export type PollDailyTaskRealtimeEventsQuery = {
  readonly actor: OrgAccessActor;
  readonly after: string | undefined;
  readonly waitMs: number;
  readonly signal: AbortSignal;
};