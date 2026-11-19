import { Inject, Injectable, Logger } from '@nestjs/common';
import type { DailyTaskRealtimeEventType } from '#contracts';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import {
  DailyTaskRealtimeService,
  type RecordDailyTaskRealtimeEventInput,
} from './daily-task-realtime.service.js';

/**
 * Called only after the task write has committed. A failure here must not turn a committed
 * change into an error response; clients still converge through the periodic refresh.
 */
@Injectable()
export class DailyTaskRealtimePublisher {
  private readonly logger = new Logger(DailyTaskRealtimePublisher.name);

  constructor(
    @Inject(DailyTaskRealtimeService) private readonly realtime: DailyTaskRealtimeService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /** Sign-in accounts linked to the given employees (same organization only). */
  async adminIdsForEmployees(
    organizationId: string,
    employeeIds: readonly (string | null)[],
  ): Promise<string[]> {
    const ids = [...new Set(employeeIds.filter((id): id is string => typeof id === 'string'))];
    if (ids.length === 0) return [];
    const rows = await this.prisma.employee.findMany({
      where: { organizationId, id: { in: ids } },
      select: { platformAdminId: true },
    });
    return [
      ...new Set(
        rows.map((row) => row.platformAdminId).filter((id): id is string => typeof id === 'string'),
      ),
    ];
  }

  async publishTaskChange(input: {
    readonly organizationId: string;
    readonly taskId: string;
    readonly type: DailyTaskRealtimeEventType;
    readonly assigneeEmployeeIds?: readonly (string | null)[];
    readonly metadata?: Record<string, unknown>;
    readonly notifyOrganizationManagers?: boolean;
  }): Promise<void> {
    await this.safely(input.type, input.taskId, async () => ({
      organizationId: input.organizationId,
      dailyTaskId: input.taskId,
      type: input.type,
      recipientAdminIds: input.assigneeEmployeeIds
        ? await this.adminIdsForEmployees(input.organizationId, input.assigneeEmployeeIds)
        : [],
      notifyOrganizationManagers: input.notifyOrganizationManagers ?? true,
      metadata: input.metadata,
    }));
  }

  /** Previous and new assignees are both notified so removed employees drop the task immediately. */
  async publishAssigneesChanged(input: {
    readonly organizationId: string;
    readonly taskId: string;
    readonly fromEmployeeIds: readonly (string | null)[];
    readonly toEmployeeIds: readonly (string | null)[];
  }): Promise<void> {
    await this.safely('ASSIGNEES_CHANGED', input.taskId, async () => ({
      organizationId: input.organizationId,
      dailyTaskId: input.taskId,
      type: 'ASSIGNEES_CHANGED',
      recipientAdminIds: await this.adminIdsForEmployees(input.organizationId, [
        ...input.fromEmployeeIds,
        ...input.toEmployeeIds,
      ]),
      notifyOrganizationManagers: true,
      metadata: {
        fromEmployeeIds: input.fromEmployeeIds,
        toEmployeeIds: input.toEmployeeIds,
      },
    }));
  }

  private async safely(
    type: DailyTaskRealtimeEventType,
    taskId: string,
    build: () => Promise<RecordDailyTaskRealtimeEventInput>,
  ): Promise<void> {
    try {
      await this.realtime.recordEvent(await build());
    } catch (error) {
      this.logger.warn(
        `Daily task realtime event ${type} for task ${taskId} was not recorded: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
