import { EventEmitter } from 'node:events';
import { Inject, Injectable } from '@nestjs/common';
import type {
  DailyTaskRealtimeEventType,
  DailyTaskRealtimeResponse,
} from '#contracts';
import { canViewOrganizationDailyTasks } from '#contracts';
import type { Prisma } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import type { OrgAccessActor } from '../../../../../org-access/application/shared/org-access-actor.js';
import { PermissionCheckerService } from '../../../../../org-access/application/services/permission-checker.service.js';

const DB_POLL_MS = 1_500;
const MAX_BACKLOG = 500;
const BATCH = 100;

export type RecordDailyTaskRealtimeEventInput = {
  readonly organizationId: string;
  readonly dailyTaskId: string | null;
  readonly type: DailyTaskRealtimeEventType;
  readonly recipientAdminIds: readonly string[];
  readonly notifyOrganizationManagers?: boolean;
  readonly metadata?: Record<string, unknown>;
};

@Injectable()
export class DailyTaskRealtimeService {
  private readonly emitter = new EventEmitter();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
  ) {
    this.emitter.setMaxListeners(0);
  }

  notify(organizationId: string): void {
    this.emitter.emit(organizationId);
  }

  async recordEvent(input: RecordDailyTaskRealtimeEventInput): Promise<void> {
    await this.prisma.dailyTaskRealtimeEvent.create({
      data: {
        organizationId: input.organizationId,
        dailyTaskId: input.dailyTaskId,
        type: input.type,
        recipientAdminIds: [...input.recipientAdminIds],
        notifyOrganizationManagers: input.notifyOrganizationManagers ?? false,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    this.notify(input.organizationId);
  }

  async latestCursor(organizationId: string): Promise<bigint> {
    const row = await this.prisma.dailyTaskRealtimeEvent.findFirst({
      where: { organizationId },
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    return row?.id ?? BigInt(0);
  }

  async poll(
    actor: OrgAccessActor,
    after: string | undefined,
    waitMs: number,
    signal: AbortSignal,
  ): Promise<DailyTaskRealtimeResponse> {
    const latest = await this.latestCursor(actor.organizationId);
    if (after === undefined) {
      return { events: [], cursor: latest.toString(), resync: false };
    }

    let cursor = BigInt(after);
    if (cursor > latest) cursor = latest;
    if (latest - cursor > BigInt(MAX_BACKLOG)) {
      return { events: [], cursor: latest.toString(), resync: true };
    }

    const effective = new Set(await this.permissions.resolveEffectivePermissions(actor));
    const canReceiveOrgManagerEvents = canViewOrganizationDailyTasks(
      effective,
      actor.isPlatformSuperAdmin,
    );

    const deadline = Date.now() + waitMs;
    for (;;) {
      const batch = await this.prisma.dailyTaskRealtimeEvent.findMany({
        where: {
          organizationId: actor.organizationId,
          id: { gt: cursor },
        },
        orderBy: { id: 'asc' },
        take: BATCH,
      });
      const visible = batch.filter((row) =>
        row.recipientAdminIds.includes(actor.adminId) ||
        (row.notifyOrganizationManagers && canReceiveOrgManagerEvents),
      );
      if (batch.length > 0) {
        cursor = batch[batch.length - 1]!.id;
      }
      if (visible.length > 0 || signal.aborted) {
        return {
          // Assignee recipients only learn that a task changed; employee ids stay with managers.
          events: visible.map((row) => ({
            id: row.id.toString(),
            type: row.type,
            taskId: row.dailyTaskId,
            notifyOrganizationManagers: row.notifyOrganizationManagers,
            metadata: canReceiveOrgManagerEvents
              ? ((row.metadata as Record<string, unknown> | null) ?? null)
              : null,
            occurredAt: row.createdAt.toISOString(),
          })),
          cursor: cursor.toString(),
          resync: false,
        };
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        return { events: [], cursor: cursor.toString(), resync: false };
      }
      await this.waitForWake(actor.organizationId, Math.min(remaining, DB_POLL_MS), signal);
    }
  }

  private waitForWake(organizationId: string, ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.emitter.off(organizationId, done);
        signal.removeEventListener('abort', done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.emitter.on(organizationId, done);
      signal.addEventListener('abort', done, { once: true });
    });
  }
}