import { Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '#contracts';
import type { OrgAccessActor } from '../../../../../org-access/application/shared/org-access-actor.js';
import { PermissionCheckerService } from '../../../../../org-access/application/services/permission-checker.service.js';
import { DailyTaskForbiddenError } from '../../domain/errors/daily-task.errors.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import type { TaskNoteAttachOptions } from '../../domain/types/daily-task-inputs.js';
import {
  hasPmDailyTaskMovePermission,
  hasPmDailyTaskViewDetailsPermission,
  hasUnrestrictedOrgPermissions,
  PM_DAILY_TASKS_VIEW_KEY,
} from '#contracts';
import {
  hasDailyTaskCommentPermission,
  hasDailyTaskNoteAcknowledgePermission,
  hasDailyTaskNoteCreatePermission,
  hasDailyTaskNoteSubmitPermission,
  hasDailyTaskNoteViewAllPermission,
  hasDailyTaskNoteViewOwnPermission,
  hasDailyTaskUpdateStatusPermission,
} from './daily-task-permission.helpers.js';

const ORGANIZATION_TASK_MANAGE_KEYS: readonly PermissionKey[] = [
  'tasks.create',
  'tasks.assign',
  'tasks.update',
  'tasks.delete',
  'project_management.daily_tasks.assign',
  'project_management.daily_tasks.edit',
  'project_management.daily_tasks.delete',
];

/**
 * Signals that the account collaborates on organization task boards (not self-service).
 * Do not include `projects.read` alone — the Employee system role also has it for own
 * project-task visibility, which must stay self-scoped.
 */
const ORGANIZATION_TASK_COLLABORATOR_KEYS: readonly PermissionKey[] = [
  'employees.view',
  'leads.read',
  'clients.read',
];

@Injectable()
export class DailyTaskAuthorizationService {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
    @Inject(DAILY_TASK_REPOSITORY) private readonly tasks: DailyTaskRepository,
  ) {}

  async resolveEffective(actor: OrgAccessActor): Promise<ReadonlySet<PermissionKey>> {
    const keys = await this.permissions.resolveEffectivePermissions(actor);
    return new Set(keys);
  }

  canManageOrganizationTasks(
    actor: OrgAccessActor,
    effective: ReadonlySet<PermissionKey>,
  ): boolean {
    if (actor.isPlatformSuperAdmin) return true;
    return ORGANIZATION_TASK_MANAGE_KEYS.some((key) => effective.has(key));
  }

  canViewOrganizationTasks(
    actor: OrgAccessActor,
    effective: ReadonlySet<PermissionKey>,
  ): boolean {
    if (actor.isPlatformSuperAdmin) return true;
    if (this.canManageOrganizationTasks(actor, effective)) return true;
    if (effective.has(PM_DAILY_TASKS_VIEW_KEY)) return true;
    if (!effective.has('tasks.read')) return false;
    if (ORGANIZATION_TASK_COLLABORATOR_KEYS.some((key) => effective.has(key))) return true;
    // Projects View + Tasks View unlocks org boards even when the account also has
    // employee self-service keys (e.g. Employee role granted projects.read).
    if (effective.has('projects.read') && effective.has('tasks.read')) return true;
    if (
      effective.has('attendance.punch.view') ||
      effective.has('leave.requests.read_own') ||
      effective.has('leave.balances.read_own')
    ) {
      return false;
    }
    return false;
  }

  async assertOrganizationTaskAccess(actor: OrgAccessActor): Promise<void> {
    const effective = await this.resolveEffective(actor);
    if (!this.canViewOrganizationTasks(actor, effective)) {
      throw new DailyTaskForbiddenError('Organization-wide daily task access is not allowed.');
    }
  }

  async assertCanReadTask(actor: OrgAccessActor, taskId: string): Promise<void> {
    const effective = await this.resolveEffective(actor);
    if (this.canViewOrganizationTasks(actor, effective)) {
      if (
        actor.isPlatformSuperAdmin ||
        hasUnrestrictedOrgPermissions(effective) ||
        hasPmDailyTaskViewDetailsPermission(effective)
      ) {
        return;
      }
      throw new DailyTaskForbiddenError(
        'You do not have permission to view daily task details. Enable Daily Tasks → View Card Details for your role.',
      );
    }
    const assigned = await this.tasks.isTaskAssignedToAdmin(
      actor.organizationId,
      actor.adminId,
      taskId,
    );
    if (!assigned) throw new DailyTaskForbiddenError();
  }

  async assertCanUpdateTaskProgress(actor: OrgAccessActor, taskId: string): Promise<void> {
    const effective = await this.resolveEffective(actor);
    if (actor.isPlatformSuperAdmin) return;
    if (
      this.canViewOrganizationTasks(actor, effective) &&
      hasPmDailyTaskMovePermission(effective)
    ) {
      return;
    }
    if (!hasDailyTaskUpdateStatusPermission(effective)) {
      throw new DailyTaskForbiddenError(
        'You do not have permission to move daily tasks. Enable Daily Tasks → Move / Drag & Drop for your role.',
      );
    }
    const assigned = await this.tasks.isTaskAssignedToAdmin(
      actor.organizationId,
      actor.adminId,
      taskId,
    );
    if (!assigned) throw new DailyTaskForbiddenError();
  }

  async assertCanAddComment(
    actor: OrgAccessActor,
    taskId: string,
    scope: 'admin' | 'employee',
  ): Promise<void> {
    const effective = await this.resolveEffective(actor);
    if (scope === 'admin') {
      if (!this.canManageOrganizationTasks(actor, effective) && !effective.has('tasks.update')) {
        throw new DailyTaskForbiddenError('You do not have permission to add administrative notes.');
      }
      return;
    }
    if (this.canManageOrganizationTasks(actor, effective) || effective.has('tasks.update')) return;
    if (!hasDailyTaskCommentPermission(effective)) {
      throw new DailyTaskForbiddenError('You do not have permission to add task notes.');
    }
    const assigned = await this.tasks.isTaskAssignedToAdmin(
      actor.organizationId,
      actor.adminId,
      taskId,
    );
    if (!assigned) throw new DailyTaskForbiddenError();
  }

  async resolveNoteAttach(actor: OrgAccessActor): Promise<TaskNoteAttachOptions> {
    const effective = await this.resolveEffective(actor);
    return {
      adminId: actor.adminId,
      includeOrgUnread:
        actor.isPlatformSuperAdmin ||
        (hasDailyTaskNoteViewAllPermission(effective) &&
          this.canManageOrganizationTasks(actor, effective)),
      includeOwnSummary: !actor.isPlatformSuperAdmin,
      includeCanAddNote: !actor.isPlatformSuperAdmin,
    };
  }

  async assertCanCreateTaskNote(actor: OrgAccessActor, taskId: string): Promise<void> {
    if (actor.isPlatformSuperAdmin) {
      throw new DailyTaskForbiddenError('Super Admin cannot submit task notes from task cards.');
    }
    const effective = await this.resolveEffective(actor);
    if (!hasDailyTaskNoteSubmitPermission(effective)) {
      throw new DailyTaskForbiddenError('You do not have permission to add task notes.');
    }
    if (this.canViewOrganizationTasks(actor, effective)) {
      return;
    }
    const assigned = await this.tasks.isTaskAssignedToAdmin(
      actor.organizationId,
      actor.adminId,
      taskId,
    );
    if (!assigned) throw new DailyTaskForbiddenError();
  }

  /** @returns true when caller may view all notes on the task. */
  async assertCanListTaskNotes(actor: OrgAccessActor, taskId: string): Promise<boolean> {
    const effective = await this.resolveEffective(actor);
    if (hasDailyTaskNoteViewAllPermission(effective) && this.canManageOrganizationTasks(actor, effective)) {
      await this.assertCanReadTask(actor, taskId);
      return true;
    }
    if (
      hasDailyTaskNoteViewOwnPermission(effective) ||
      hasDailyTaskNoteSubmitPermission(effective)
    ) {
      if (this.canViewOrganizationTasks(actor, effective)) {
        return false;
      }
      const assigned = await this.tasks.isTaskAssignedToAdmin(
        actor.organizationId,
        actor.adminId,
        taskId,
      );
      if (!assigned) throw new DailyTaskForbiddenError();
      return false;
    }
    throw new DailyTaskForbiddenError('You do not have permission to view task notes.');
  }

  async assertCanReviewOrganizationTaskNotes(actor: OrgAccessActor): Promise<void> {
    if (!actor.isPlatformSuperAdmin) {
      throw new DailyTaskForbiddenError(
        'Only platform Super Admin can review organization task notes.',
      );
    }
  }

  async assertCanAcknowledgeTaskNote(actor: OrgAccessActor, taskId: string): Promise<void> {
    await this.assertCanReviewOrganizationTaskNotes(actor);
    await this.assertCanReadTask(actor, taskId);
  }
}
