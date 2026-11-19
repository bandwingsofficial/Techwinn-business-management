import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskRealtimePublisher } from '../services/daily-task-realtime.publisher.js';
import type { CreateDailyTaskCommand } from './create-daily-task.command.js';

@Injectable()
export class CreateDailyTaskHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskRealtimePublisher) private readonly realtime: DailyTaskRealtimePublisher,
  ) {}

  async execute(command: CreateDailyTaskCommand): Promise<DailyTaskDetail> {
    const detail = await this.repository.createTask(
      command.actor.organizationId,
      command.actor.adminId,
      command.input,
    );
    await this.realtime.publishTaskChange({
      organizationId: command.actor.organizationId,
      taskId: detail.id,
      type: 'TASK_CREATED',
      assigneeEmployeeIds: detail.assignees.map((row) => row.employeeId),
    });
    return detail;
  }
}
