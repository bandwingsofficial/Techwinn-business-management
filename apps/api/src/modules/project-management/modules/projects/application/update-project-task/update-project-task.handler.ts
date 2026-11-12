import { Inject, Injectable } from '@nestjs/common';
import { PROJECT_TASK_ACTION_PERMISSIONS } from '#contracts';
import { PermissionCheckerService } from '../../../../../org-access/index.js';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { UpdateProjectTaskCommand } from './update-project-task.command.js';

const DETAIL_KEYS = [
  'title',
  'phaseId',
  'priority',
  'status',
  'description',
  'startDate',
  'dueDate',
  'labels',
] as const;

@Injectable()
export class UpdateProjectTaskHandler {
  constructor(
    @Inject(PROJECT_TASK_REPOSITORY) private readonly repository: ProjectTaskRepository,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
  ) {}

  async execute(command: UpdateProjectTaskCommand) {
    const current = await this.repository.getTask(
      command.actor.organizationId,
      command.projectId,
      command.taskId,
    );

    const detailsChanging = DETAIL_KEYS.some((key) => command.input[key] !== undefined);
    const assigneeChanging =
      command.input.assigneeAdminId !== undefined &&
      (current?.assigneeAdminId ?? null) !== command.input.assigneeAdminId;

    if (detailsChanging) {
      await this.permissions.requirePermissions(command.accessActor, [
        PROJECT_TASK_ACTION_PERMISSIONS.update,
      ]);
    }
    if (assigneeChanging) {
      await this.permissions.requirePermissions(command.accessActor, [
        PROJECT_TASK_ACTION_PERMISSIONS.assign,
      ]);
    }

    return this.repository.updateTask(
      command.actor.organizationId,
      command.projectId,
      command.taskId,
      command.input,
    );
  }
}
