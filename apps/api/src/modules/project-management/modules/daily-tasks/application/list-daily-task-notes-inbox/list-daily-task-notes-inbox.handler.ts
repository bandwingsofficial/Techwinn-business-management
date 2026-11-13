import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskNoteInboxItem } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import type { ListDailyTaskNotesInboxQuery } from './list-daily-task-notes-inbox.query.js';

@Injectable()
export class ListDailyTaskNotesInboxHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
  ) {}

  async execute(query: ListDailyTaskNotesInboxQuery): Promise<readonly DailyTaskNoteInboxItem[]> {
    await this.authz.assertCanReviewOrganizationTaskNotes(query.accessActor);
    return this.repository.listOrganizationTaskNotesInbox(query.actor.organizationId, query.status);
  }
}
