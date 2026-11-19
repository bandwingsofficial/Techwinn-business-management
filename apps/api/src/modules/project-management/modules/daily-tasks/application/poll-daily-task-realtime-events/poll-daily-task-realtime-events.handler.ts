import { Inject, Injectable } from '@nestjs/common';
import { DailyTaskRealtimeService } from '../services/daily-task-realtime.service.js';
import type { PollDailyTaskRealtimeEventsQuery } from './poll-daily-task-realtime-events.query.js';

@Injectable()
export class PollDailyTaskRealtimeEventsHandler {
  constructor(
    @Inject(DailyTaskRealtimeService) private readonly realtime: DailyTaskRealtimeService,
  ) {}

  execute(query: PollDailyTaskRealtimeEventsQuery) {
    return this.realtime.poll(query.actor, query.after, query.waitMs, query.signal);
  }
}