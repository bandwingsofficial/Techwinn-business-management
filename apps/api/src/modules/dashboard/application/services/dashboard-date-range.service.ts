import { Inject, Injectable } from '@nestjs/common';
import type { DashboardDateRangePreset } from '#contracts';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  resolveDashboardDateRange,
  type DashboardDateRangeQuery,
  type ResolvedDashboardDateRange,
} from '../dashboard-date-range.js';

@Injectable()
export class DashboardDateRangeService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolveForOrganization(
    organizationId: string,
    preset: DashboardDateRangePreset = 'month',
    from?: string,
    to?: string,
  ): Promise<ResolvedDashboardDateRange> {
    const schedule = await this.prisma.attendanceSchedule.findFirst({
      where: { organizationId },
      orderBy: { effectiveFrom: 'desc' },
      select: { timeZone: true },
    });
    const timeZone = schedule?.timeZone?.trim() || 'UTC';
    const query: DashboardDateRangeQuery = { preset, from, to };
    return resolveDashboardDateRange(query, timeZone);
  }
}