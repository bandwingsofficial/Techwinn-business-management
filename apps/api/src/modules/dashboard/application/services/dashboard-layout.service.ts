import { Inject, Injectable } from '@nestjs/common';
import type { DashboardLayoutConfiguration } from '#contracts';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import type { OrgAccessActor } from '../../../org-access/application/shared/org-access-actor.js';

@Injectable()
export class DashboardLayoutService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getLayout(actor: OrgAccessActor): Promise<DashboardLayoutConfiguration> {
    const row = await this.prisma.organizationAdminDashboardLayout.findUnique({
      where: {
        organizationId_adminId: {
          organizationId: actor.organizationId,
          adminId: actor.adminId,
        },
      },
    });
    if (!row) {
      return { widgetOrder: [], hiddenWidgets: [], updatedAt: null };
    }
    return {
      widgetOrder: row.widgetOrder,
      hiddenWidgets: row.hiddenWidgets,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async patchLayout(
    actor: OrgAccessActor,
    input: { widgetOrder?: readonly string[]; hiddenWidgets?: readonly string[] },
  ): Promise<DashboardLayoutConfiguration> {
    const existing = await this.prisma.organizationAdminDashboardLayout.findUnique({
      where: {
        organizationId_adminId: {
          organizationId: actor.organizationId,
          adminId: actor.adminId,
        },
      },
    });
    const widgetOrder = input.widgetOrder ?? existing?.widgetOrder ?? [];
    const hiddenWidgets = input.hiddenWidgets ?? existing?.hiddenWidgets ?? [];
    const row = await this.prisma.organizationAdminDashboardLayout.upsert({
      where: {
        organizationId_adminId: {
          organizationId: actor.organizationId,
          adminId: actor.adminId,
        },
      },
      create: {
        organizationId: actor.organizationId,
        adminId: actor.adminId,
        widgetOrder: [...widgetOrder],
        hiddenWidgets: [...hiddenWidgets],
      },
      update: {
        widgetOrder: [...widgetOrder],
        hiddenWidgets: [...hiddenWidgets],
      },
    });
    return {
      widgetOrder: row.widgetOrder,
      hiddenWidgets: row.hiddenWidgets,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}