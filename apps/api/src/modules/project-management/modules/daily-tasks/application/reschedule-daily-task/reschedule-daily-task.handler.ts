import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import { DailyTaskRealtimePublisher } from '../services/daily-task-realtime.publisher.js';
import type { RescheduleDailyTaskCommand } from './reschedule-daily-task.command.js';

@Injectable()
export class RescheduleDailyTaskHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
    @Inject(DailyTaskRealtimePublisher) private readonly realtime: DailyTaskRealtimePublisher,
  ) {}

  async execute(command: RescheduleDailyTaskCommand): Promise<DailyTaskDetail> {
    await this.authz.assertCanReadTask(command.accessActor, command.taskId);
    const detail = await this.repository.rescheduleTask(
      command.actor.organizationId,
      command.actor.adminId,
      command.taskId,
      command.input,
    );
    await this.realtime.publishTaskChange({
      organizationId: command.actor.organizationId,
      taskId: command.taskId,
      type: 'TASK_UPDATED',
      assigneeEmployeeIds: detail.assignees.map((row) => row.employeeId),
    });
    return detail;
  }
}
