import { Inject, Injectable } from '@nestjs/common';
import { PermissionCheckerService } from '../../../../../org-access/index.js';
import { DailyTaskRealtimePublisher } from '../services/daily-task-realtime.publisher.js';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { sameEmployeeIds } from '../shared/assignee-ids.js';
import type { UpdateDailyTaskCommand } from './update-daily-task.command.js';

@Injectable()
export class UpdateDailyTaskHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
    @Inject(DailyTaskRealtimePublisher) private readonly realtime: DailyTaskRealtimePublisher,
  ) {}

  async execute(command: UpdateDailyTaskCommand): Promise<DailyTaskDetail> {
    let previousAssigneeIds: string[] | undefined;
    if (command.input.employeeIds) {
      const current = await this.repository.getTask(
        command.actor.organizationId,
        command.taskId,
      );
      const currentIds = current.assignees.map((assignee) => assignee.employeeId);
      previousAssigneeIds = currentIds;
      if (!sameEmployeeIds(currentIds, command.input.employeeIds)) {
        await this.permissions.requirePermissions(command.accessActor, ['tasks.assign']);
      }
    }
    const detail = await this.repository.updateTask(
      command.actor.organizationId,
      command.actor.adminId,
      command.taskId,
      command.input,
    );
    if (command.input.employeeIds && previousAssigneeIds) {
      const nextIds = detail.assignees.map((row) => row.employeeId);
      if (!sameEmployeeIds(previousAssigneeIds, nextIds)) {
        await this.realtime.publishAssigneesChanged({
          organizationId: command.actor.organizationId,
          taskId: command.taskId,
          fromEmployeeIds: previousAssigneeIds,
          toEmployeeIds: nextIds,
        });
      }
    } else {
      await this.realtime.publishTaskChange({
        organizationId: command.actor.organizationId,
        taskId: command.taskId,
        type: 'TASK_UPDATED',
        assigneeEmployeeIds: detail.assignees.map((row) => row.employeeId),
      });
    }
    return detail;
  }
}
