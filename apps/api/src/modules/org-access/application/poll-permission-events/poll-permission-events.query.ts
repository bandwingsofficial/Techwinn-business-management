export type PollPermissionEventsQuery = {
  readonly organizationId: string;
  readonly after: string | undefined;
  readonly waitMs: number;
  readonly signal: AbortSignal;
};
