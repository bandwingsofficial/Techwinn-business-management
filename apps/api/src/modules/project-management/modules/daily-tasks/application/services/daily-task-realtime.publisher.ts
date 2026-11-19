import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskRealtimeEventType } from '#contracts';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import {
  DailyTaskRealtimeService,
  type RecordDailyTaskRealtimeEventInput,
} from './daily-task-realtime.service.js';

@Injectable()
export class DailyTaskRealtimePublisher {
  constructor(
    @Inject(DailyTaskRealtimeService) private readonly realtime: DailyTaskRealtimeService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async adminIdsForEmployees(
    organizationId: string,
    employeeIds: readonly string[],
  ): Promise<string[]> {
    if (employeeIds.length === 0) return [];
    const rows = await this.prisma.employee.findMany({
      where: { organizationId, id: { in: [...employeeIds] } },
      select: { platformAdminId: true },
    });
    return [
      ...new Set(
        rows.map((row) => row.platformAdminId).filter((id): id is string => typeof id === 'string'),
      ),
    ];
  }

  async publish(input: RecordDailyTaskRealtimeEventInput): Promise<void> {
    await this.realtime.recordEvent(input);
  }

  async publishTaskChange(input: {
    readonly organizationId: string;
    readonly taskId: string;
    readonly type: DailyTaskRealtimeEventType;
    readonly assigneeEmployeeIds?: readonly string[];
    readonly metadata?: Record<string, unknown>;
    readonly notifyOrganizationManagers?: boolean;
  }): Promise<void> {
    const recipientAdminIds = input.assigneeEmployeeIds
      ? await this.adminIdsForEmployees(input.organizationId, input.assigneeEmployeeIds)
      : [];
    await this.publish({
      organizationId: input.organizationId,
      dailyTaskId: input.taskId,
      type: input.type,
      recipientAdminIds,
      notifyOrganizationManagers: input.notifyOrganizationManagers ?? true,
      metadata: input.metadata,
    });
  }

  async publishAssigneesChanged(input: {
    readonly organizationId: string;
    readonly taskId: string;
    readonly fromEmployeeIds: readonly string[];
    readonly toEmployeeIds: readonly string[];
  }): Promise<void> {
    const affected = [...new Set([...input.fromEmployeeIds, ...input.toEmployeeIds])];
    const recipientAdminIds = await this.adminIdsForEmployees(input.organizationId, affected);
    await this.publish({
      organizationId: input.organizationId,
      dailyTaskId: input.taskId,
      type: 'ASSIGNEES_CHANGED',
      recipientAdminIds,
      notifyOrganizationManagers: true,
      metadata: {
        fromEmployeeIds: input.fromEmployeeIds,
        toEmployeeIds: input.toEmployeeIds,
      },
    });
  }
}