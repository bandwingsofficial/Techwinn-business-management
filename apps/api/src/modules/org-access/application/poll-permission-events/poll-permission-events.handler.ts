import { Inject, Injectable } from '@nestjs/common';
import type { MyPermissionEventsResponse } from '#contracts';
import {
  OrgAccessPermissionRealtimeService,
} from '../services/org-access-permission-realtime.service.js';
import type { PollPermissionEventsQuery } from './poll-permission-events.query.js';

@Injectable()
export class PollPermissionEventsHandler {
  constructor(
    @Inject(OrgAccessPermissionRealtimeService)
    private readonly realtime: OrgAccessPermissionRealtimeService,
  ) {}

  execute(query: PollPermissionEventsQuery): Promise<MyPermissionEventsResponse> {
    return this.realtime.waitForChange(
      query.organizationId,
      query.after,
      query.waitMs,
      query.signal,
    );
  }
}
