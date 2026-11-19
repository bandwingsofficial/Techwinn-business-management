import { Inject, Injectable } from '@nestjs/common';
import type {
  DashboardChartPayload,
  DashboardDataScopeKind,
  DashboardWidgetData,
} from '#contracts';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import type { OrgAccessActor } from '../../../org-access/application/shared/org-access-actor.js';
import type { Prisma } from '../../../../generated/prisma/client.js';
import {
  dayStartInstant,
  orgLocalDayKey,
  resolvePreviousDashboardRange,
  trendDaysForRange,
  trendWindowCoversRange,
  utcDateToCalendarKey,
  type ResolvedDashboardDateRange,
} from '../dashboard-date-range.js';
import { buildPeriodKpiMetric } from '../dashboard-kpi-metric.js';
import {
  DAILY_TASK_STATUS_CHART_LABELS,
  dailyTaskOpenWhere,
  dailyTaskStatusBucketOrder,
  dailyTaskStatusWhere,
} from '../daily-task-dashboard-status.js';

function formatLeadSourceLabel(source: string): string {
  return source
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Bucket timestamps into the trend's org-local days. Days with no rows get 0.
 * Done in memory on one bounded query instead of one database query per day.
 */
function countTimestampsByOrgDay(
  timestamps: readonly Date[],
  days: readonly Date[],
  timeZone: string,
): number[] {
  const index = new Map(days.map((day, i) => [utcDateToCalendarKey(day), i]));
  const counts = new Array<number>(days.length).fill(0);
  for (const ts of timestamps) {
    const i = index.get(orgLocalDayKey(ts, timeZone));
    if (i !== undefined) counts[i] = (counts[i] ?? 0) + 1;
  }
  return counts;
}

function dayLabel(day: Date): string {
  return utcDateToCalendarKey(day).slice(5, 10);
}

function assignDateRangeWhere(
  range: ResolvedDashboardDateRange,
): Prisma.DailyTaskWhereInput {
  return { assignDate: { gte: range.dateFrom, lte: range.dateTo } };
}

@Injectable()
export class DashboardDataService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async loadWidget(
    actor: OrgAccessActor,
    widgetKey: string,
    scope: DashboardDataScopeKind | null,
    range: ResolvedDashboardDateRange,
  ): Promise<DashboardWidgetData> {
    const generatedAt = new Date().toISOString();
    if (widgetKey === 'overview.welcome') {
      return { widgetKey, scope, empty: false, generatedAt, kpis: [] };
    }
    if (widgetKey.startsWith('tasks.')) {
      return this.loadTasksWidget(actor, widgetKey, scope, range, generatedAt);
    }
    if (widgetKey.startsWith('crm.')) {
      return this.loadCrmWidget(actor, widgetKey, scope, range, generatedAt);
    }
    if (widgetKey.startsWith('projects.')) {
      return this.loadProjectsWidget(actor, widgetKey, scope, range, generatedAt);
    }
    if (widgetKey.startsWith('employees.')) {
      return this.loadEmployeesWidget(actor, widgetKey, generatedAt, range);
    }
    if (widgetKey.startsWith('attendance.')) {
      return this.loadAttendanceWidget(actor, widgetKey, scope, range, generatedAt);
    }
    if (widgetKey.startsWith('leave.')) {
      return this.loadLeaveWidget(actor, widgetKey, scope, range, generatedAt);
    }
    if (widgetKey === 'reports.performance') {
      return this.loadReportsWidget(actor, scope, generatedAt);
    }
    return { widgetKey, scope, empty: true, generatedAt };
  }

  private async sessionEmployeeId(actor: OrgAccessActor): Promise<string | null> {
    const row = await this.prisma.employee.findFirst({
      where: {
        organizationId: actor.organizationId,
        platformAdminId: actor.adminId,
        deactivatedAt: null,
      },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  private taskScopeWhere(
    actor: OrgAccessActor,
    scope: DashboardDataScopeKind | null,
    employeeId: string | null,
  ): Prisma.DailyTaskWhereInput {
    const base: Prisma.DailyTaskWhereInput = { organizationId: actor.organizationId };
    if (scope === 'assigned' && employeeId) {
      return { ...base, assignees: { some: { employeeId } } };
    }
    if (scope === 'assigned') {
      return { ...base, assignees: { some: { employee: { platformAdminId: actor.adminId } } } };
    }
    return base;
  }

  private async countTaskStatusBuckets(
    where: Prisma.DailyTaskWhereInput,
    completedStageIds: readonly string[],
    orgToday: Date,
  ) {
    const buckets = dailyTaskStatusBucketOrder();
    const counts = await Promise.all(
      buckets.map((bucket) =>
        this.prisma.dailyTask.count({
          where: { AND: [where, dailyTaskStatusWhere(bucket, completedStageIds, orgToday)] },
        }),
      ),
    );
    const byBucket = Object.fromEntries(
      buckets.map((bucket, index) => [bucket, counts[index] ?? 0]),
    ) as Record<(typeof buckets)[number], number>;
    const total = buckets.reduce((sum, bucket) => sum + byBucket[bucket], 0);
    return { byBucket, total };
  }

  /** Tasks assigned per org-local day across the trend window of `range` (scope-respecting). */
  private async assignedCountsByDay(
    where: Prisma.DailyTaskWhereInput,
    range: ResolvedDashboardDateRange,
  ): Promise<{ days: Date[]; counts: number[] }> {
    const days = trendDaysForRange(range);
    const firstDay = days[0] ?? range.dateFrom;
    const groups = await this.prisma.dailyTask.groupBy({
      by: ['assignDate'],
      where: { AND: [where, { assignDate: { gte: firstDay, lte: range.dateTo } }] },
      _count: { _all: true },
    });
    const byDay = new Map<string, number>();
    for (const group of groups) {
      const key = utcDateToCalendarKey(group.assignDate);
      byDay.set(key, (byDay.get(key) ?? 0) + group._count._all);
    }
    return {
      days,
      counts: days.map((day) => byDay.get(utcDateToCalendarKey(day)) ?? 0),
    };
  }

  private async loadTasksWidget(
    actor: OrgAccessActor,
    widgetKey: string,
    scope: DashboardDataScopeKind | null,
    range: ResolvedDashboardDateRange,
    generatedAt: string,
  ): Promise<DashboardWidgetData> {
    const employeeId = await this.sessionEmployeeId(actor);
    const where = this.taskScopeWhere(actor, scope, employeeId);
    const rangeWhere = { AND: [where, assignDateRangeWhere(range)] };
    const orgToday = range.orgToday;

    const [completedStages, recent] = await Promise.all([
      this.prisma.dailyTaskWorkflowStage.findMany({
        where: { organizationId: actor.organizationId, isCompletedStage: true },
        select: { id: true },
      }),
      this.prisma.dailyTask.findMany({
        where: rangeWhere,
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          title: true,
          priority: true,
          dueDate: true,
          updatedAt: true,
          workflowStage: { select: { name: true } },
          assignees: {
            take: 1,
            select: { historicalDisplayName: true, employee: { select: { displayName: true } } },
          },
          project: { select: { name: true } },
        },
      }),
    ]);

    const completedStageIds = completedStages.map((s) => s.id);
    const { byBucket, total } = await this.countTaskStatusBuckets(
      rangeWhere,
      completedStageIds,
      orgToday,
    );

    const dueTodayCount = await this.prisma.dailyTask.count({
      where: {
        AND: [rangeWhere, dailyTaskOpenWhere(completedStageIds), { dueDate: orgToday }],
      },
    });

    if (widgetKey === 'tasks.kpi') {
      // Total tasks = tasks ASSIGNED in the selected period (assignDate), within the actor's
      // task scope. The status rows below are an exclusive breakdown of that same set.
      const previousRange = resolvePreviousDashboardRange(range);
      const [previousTotal, dailyAssigned] = await Promise.all([
        previousRange
          ? this.prisma.dailyTask.count({
              where: { AND: [where, assignDateRangeWhere(previousRange)] },
            })
          : Promise.resolve(0),
        this.assignedCountsByDay(where, range),
      ]);
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: total === 0,
        kpis: [
          buildPeriodKpiMetric({
            label: 'Total tasks',
            value: total,
            caption: 'Assigned in period',
            comparison: previousRange
              ? { previousValue: previousTotal, comparisonLabel: previousRange.comparisonLabel }
              : null,
            ...(trendWindowCoversRange(range) ? { dailyTrend: dailyAssigned.counts } : {}),
            primary: true,
          }),
          { label: 'Not started', value: byBucket.not_started },
          { label: 'Pending', value: byBucket.pending },
          { label: 'In progress', value: byBucket.in_progress },
          { label: 'Completed', value: byBucket.completed },
          { label: 'Overdue', value: byBucket.overdue },
          { label: 'Due today', value: dueTodayCount },
        ],
      };
    }

    if (widgetKey === 'tasks.status_chart') {
      const series: DashboardChartPayload['series'][number][] = dailyTaskStatusBucketOrder().map(
        (bucket) => ({
          label: DAILY_TASK_STATUS_CHART_LABELS[bucket],
          value: byBucket[bucket],
        }),
      );

      const buckets: DashboardChartPayload = {
        chartType: 'donut',
        series,
        totalValue: total,
      };
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: total === 0,
        chart: buckets,
      };
    }

    if (widgetKey === 'tasks.trend_chart') {
      const { days, counts: assignedCounts } = await this.assignedCountsByDay(where, range);
      const firstDay = days[0] ?? range.dateFrom;
      const windowStart = dayStartInstant(firstDay, range.timeZone);
      const windowEnd = range.instantTo;
      const completedRows = await this.prisma.dailyTask.findMany({
        where: { ...where, completedAt: { gte: windowStart, lt: windowEnd } },
        select: { completedAt: true },
      });
      const completedCounts = countTimestampsByOrgDay(
        completedRows.flatMap((row) => (row.completedAt ? [row.completedAt] : [])),
        days,
        range.timeZone,
      );
      const assigned = days.map((day, i) => ({ label: dayLabel(day), value: assignedCounts[i] ?? 0 }));
      const completed = days.map((day, i) => ({ label: dayLabel(day), value: completedCounts[i] ?? 0 }));
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: assigned.every((p) => p.value === 0) && completed.every((p) => p.value === 0),
        chart: {
          chartType: 'line',
          series: [],
          multiSeries: [
            { name: 'Assigned', points: assigned },
            { name: 'Completed', points: completed },
          ],
        },
      };
    }

    if (widgetKey === 'tasks.recent_table') {
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: recent.length === 0,
        table: {
        columns: [
          { key: 'title', label: 'Task' },
          { key: 'assignee', label: 'Assignee' },
          { key: 'project', label: 'Project' },
          { key: 'priority', label: 'Priority' },
          { key: 'dueDate', label: 'Due' },
          { key: 'status', label: 'Status' },
        ],
        rows: recent.map((row) => ({
          title: row.title,
          assignee:
            row.assignees[0]?.employee?.displayName ??
            row.assignees[0]?.historicalDisplayName ??
            '—',
          project: row.project?.name ?? '—',
          priority: row.priority,
          dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : '—',
          status: row.workflowStage?.name ?? '—',
        })),
        },
      };
    }

    return { widgetKey, scope, empty: true, generatedAt };
  }

  private leadScopeWhere(
    actor: OrgAccessActor,
    scope: DashboardDataScopeKind | null,
  ): Prisma.LeadWhereInput {
    const base: Prisma.LeadWhereInput = {
      organizationId: actor.organizationId,
      archivedAt: null,
    };
    if (scope === 'assigned') {
      return { ...base, assignedAdminId: actor.adminId };
    }
    // `team` uses organization-visible leads until lead team membership is modeled.
    return base;
  }

  private lostLeadScopeWhere(
    actor: OrgAccessActor,
    scope: DashboardDataScopeKind | null,
  ): Prisma.LeadWhereInput {
    const base: Prisma.LeadWhereInput = {
      organizationId: actor.organizationId,
      archivedAt: { not: null },
    };
    if (scope === 'assigned') {
      return { ...base, assignedAdminId: actor.adminId };
    }
    return base;
  }

  private async loadCrmWidget(
    actor: OrgAccessActor,
    widgetKey: string,
    scope: DashboardDataScopeKind | null,
    range: ResolvedDashboardDateRange,
    generatedAt: string,
  ): Promise<DashboardWidgetData> {
    const rangeFrom = range.instantFrom;
    const rangeToExclusive = range.instantTo;
    const where = this.leadScopeWhere(actor, scope);
    const lostWhere = this.lostLeadScopeWhere(actor, scope);

    const stagesPromise = this.prisma.pipelineStage.findMany({
      where: {
        organizationId: actor.organizationId,
        status: 'ACTIVE',
        pipeline: { organizationId: actor.organizationId, status: 'ACTIVE' },
      },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        pipeline: { select: { name: true, sortOrder: true } },
      },
      orderBy: [{ pipeline: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });

    const [
      total,
      createdInRange,
      converted,
      lost,
      stages,
      stageCounts,
      sourceCounts,
    ] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({
        where: { ...where, createdAt: { gte: rangeFrom, lt: rangeToExclusive } },
      }),
      this.prisma.lead.count({
        where: { ...where, convertedAt: { gte: rangeFrom, lt: rangeToExclusive } },
      }),
      this.prisma.lead.count({ where: lostWhere }),
      stagesPromise,
      this.prisma.lead.groupBy({
        by: ['stageId'],
        where,
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where,
        _count: { _all: true },
      }),
    ]);

    const stageCountById = new Map(
      stageCounts.map((row) => [row.stageId, row._count._all]),
    );

    if (widgetKey === 'crm.kpi') {
      // Total leads = leads CREATED in the selected period (within the actor's lead scope).
      // The all-time pipeline size is kept separately as "All active leads".
      const previousRange = resolvePreviousDashboardRange(range);
      const trendDays = trendDaysForRange(range);
      const [previousCreated, createdRows] = await Promise.all([
        previousRange
          ? this.prisma.lead.count({
              where: {
                ...where,
                createdAt: { gte: previousRange.instantFrom, lt: previousRange.instantTo },
              },
            })
          : Promise.resolve(0),
        trendWindowCoversRange(range)
          ? this.prisma.lead.findMany({
              where: { ...where, createdAt: { gte: rangeFrom, lt: rangeToExclusive } },
              select: { createdAt: true },
            })
          : Promise.resolve(null),
      ]);
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: false,
        kpis: [
          buildPeriodKpiMetric({
            label: 'Total leads',
            value: createdInRange,
            caption: 'Created in period',
            comparison: previousRange
              ? { previousValue: previousCreated, comparisonLabel: previousRange.comparisonLabel }
              : null,
            ...(createdRows
              ? {
                  dailyTrend: countTimestampsByOrgDay(
                    createdRows.map((row) => row.createdAt),
                    trendDays,
                    range.timeZone,
                  ),
                }
              : {}),
            primary: true,
          }),
          { label: 'All active leads', value: total },
          { label: 'Converted', value: converted },
          { label: 'Lost leads', value: lost },
        ],
      };
    }

    const pipelineFunnelSeries = stages.map((stage) => {
      const pipelineName = stage.pipeline.name.trim();
      const label =
        stages.filter((s) => s.name === stage.name).length > 1
          ? `${pipelineName} · ${stage.name}`
          : stage.name;
      return {
        label,
        value: stageCountById.get(stage.id) ?? 0,
      };
    });

    if (widgetKey === 'crm.funnel_chart') {
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: total === 0 && pipelineFunnelSeries.every((point) => point.value === 0),
        chart: { chartType: 'funnel', series: pipelineFunnelSeries },
      };
    }

    if (widgetKey === 'crm.source_chart') {
      const sourceSeries = sourceCounts
        .map((row) => ({
          label: formatLeadSourceLabel(row.source),
          value: row._count._all,
        }))
        .filter((point) => point.value > 0)
        .sort((a, b) => b.value - a.value);

      return {
        widgetKey,
        scope,
        generatedAt,
        empty: total === 0 && sourceSeries.length === 0,
        chart: { chartType: 'donut', series: sourceSeries },
      };
    }

    if (widgetKey === 'crm.trend_chart') {
      const days = trendDaysForRange(range);
      const createdRows = await this.prisma.lead.findMany({
        where: {
          ...where,
          createdAt: { gte: dayStartInstant(days[0] ?? range.dateFrom, range.timeZone), lt: range.instantTo },
        },
        select: { createdAt: true },
      });
      const counts = countTimestampsByOrgDay(
        createdRows.map((row) => row.createdAt),
        days,
        range.timeZone,
      );
      const series: DashboardChartPayload['series'][number][] = days.map((day, i) => ({
        label: dayLabel(day),
        value: counts[i] ?? 0,
      }));
      const createdInTrend = series.reduce((sum, point) => sum + point.value, 0);
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: total === 0 && createdInTrend === 0,
        chart: { chartType: 'area', series },
      };
    }

    if (widgetKey === 'crm.conversion_chart') {
      const days = trendDaysForRange(range);
      const windowStart = dayStartInstant(days[0] ?? range.dateFrom, range.timeZone);
      const [createdRows, convertedRows] = await Promise.all([
        this.prisma.lead.findMany({
          where: { ...where, createdAt: { gte: windowStart, lt: range.instantTo } },
          select: { createdAt: true },
        }),
        this.prisma.lead.findMany({
          where: { ...where, convertedAt: { gte: windowStart, lt: range.instantTo } },
          select: { convertedAt: true },
        }),
      ]);
      const newCounts = countTimestampsByOrgDay(
        createdRows.map((row) => row.createdAt),
        days,
        range.timeZone,
      );
      const convertedCounts = countTimestampsByOrgDay(
        convertedRows.flatMap((row) => (row.convertedAt ? [row.convertedAt] : [])),
        days,
        range.timeZone,
      );
      const created = days.map((day, i) => ({ label: dayLabel(day), value: newCounts[i] ?? 0 }));
      const convertedSeries = days.map((day, i) => ({
        label: dayLabel(day),
        value: convertedCounts[i] ?? 0,
      }));
      const activityInRange =
        created.reduce((sum, point) => sum + point.value, 0) +
        convertedSeries.reduce((sum, point) => sum + point.value, 0);
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: total === 0 && activityInRange === 0,
        chart: {
          chartType: 'line',
          series: [],
          multiSeries: [
            { name: 'New', points: created },
            { name: 'Converted', points: convertedSeries },
          ],
        },
      };
    }

    if (widgetKey === 'crm.pipeline_value') {
      const valueByStage = await Promise.all(
        stages.map(async (stage) => {
          const aggregate = await this.prisma.lead.aggregate({
            where: { ...where, stageId: stage.id },
            _sum: { estimatedValue: true },
          });
          const pipelineName = stage.pipeline.name.trim();
          const label =
            stages.filter((s) => s.name === stage.name).length > 1
              ? `${pipelineName} · ${stage.name}`
              : stage.name;
          return {
            label,
            value: Math.round(Number(aggregate._sum.estimatedValue ?? 0)),
          };
        }),
      );
      const valueSeries = valueByStage.filter((point) => point.value > 0);
      const totalValue = valueByStage.reduce((sum, point) => sum + point.value, 0);

      return {
        widgetKey,
        scope,
        generatedAt,
        empty: total === 0 && totalValue === 0,
        chart: { chartType: 'bar', series: valueSeries.length > 0 ? valueSeries : valueByStage },
      };
    }

    return { widgetKey, scope, empty: true, generatedAt };
  }

  private projectScopeWhere(
    actor: OrgAccessActor,
    scope: DashboardDataScopeKind | null,
  ): Prisma.ProjectWhereInput {
    const base: Prisma.ProjectWhereInput = { organizationId: actor.organizationId };
    if (scope === 'assigned') {
      return {
        ...base,
        OR: [
          { projectManagerAdminId: actor.adminId },
          { tasks: { some: { assigneeAdminId: actor.adminId } } },
        ],
      };
    }
    return base;
  }

  private async loadProjectsWidget(
    actor: OrgAccessActor,
    widgetKey: string,
    scope: DashboardDataScopeKind | null,
    range: ResolvedDashboardDateRange,
    generatedAt: string,
  ): Promise<DashboardWidgetData> {
    const where = this.projectScopeWhere(actor, scope);
    const today = range.orgToday;
    const statuses = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'INACTIVE'] as const;
    const counts = await Promise.all(
      statuses.map((status) => this.prisma.project.count({ where: { ...where, status } })),
    );
    const delayed = await this.prisma.project.count({
      where: {
        ...where,
        status: 'ACTIVE',
        expectedEndDate: { lt: today },
      },
    });
    const total = counts.reduce((sum, n) => sum + n, 0);

    if (widgetKey === 'projects.kpi') {
      // Total projects = projects CREATED in the selected period, within the actor's project
      // scope (employees only see projects they manage or have tasks in). The status rows are
      // a current-portfolio snapshot, not period-filtered.
      const previousRange = resolvePreviousDashboardRange(range);
      const trendDays = trendDaysForRange(range);
      const [createdInRange, previousCreated, createdRows] = await Promise.all([
        this.prisma.project.count({
          where: { ...where, createdAt: { gte: range.instantFrom, lt: range.instantTo } },
        }),
        previousRange
          ? this.prisma.project.count({
              where: {
                ...where,
                createdAt: { gte: previousRange.instantFrom, lt: previousRange.instantTo },
              },
            })
          : Promise.resolve(0),
        trendWindowCoversRange(range)
          ? this.prisma.project.findMany({
              where: { ...where, createdAt: { gte: range.instantFrom, lt: range.instantTo } },
              select: { createdAt: true },
            })
          : Promise.resolve(null),
      ]);
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: total === 0,
        kpis: [
          buildPeriodKpiMetric({
            label: 'Total projects',
            value: createdInRange,
            caption: 'Created in period',
            comparison: previousRange
              ? { previousValue: previousCreated, comparisonLabel: previousRange.comparisonLabel }
              : null,
            ...(createdRows
              ? {
                  dailyTrend: countTimestampsByOrgDay(
                    createdRows.map((row) => row.createdAt),
                    trendDays,
                    range.timeZone,
                  ),
                }
              : {}),
            primary: true,
          }),
          { label: 'All projects', value: total },
          { label: 'Active projects', value: counts[0] ?? 0 },
          { label: 'Completed', value: counts[2] ?? 0 },
          { label: 'Delayed', value: delayed },
          { label: 'On hold', value: counts[1] ?? 0 },
        ],
      };
    }

    if (widgetKey === 'projects.status_chart') {
      const series = statuses.map((status, index) => ({
        label: status.replace('_', ' '),
        value: counts[index] ?? 0,
      }));
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: total === 0,
        chart: { chartType: 'donut', series: series.filter((s) => s.value > 0) },
      };
    }

    if (widgetKey === 'projects.progress') {
      const projects = await this.prisma.project.findMany({
        where,
        take: 8,
        orderBy: { expectedEndDate: 'asc' },
        select: {
          name: true,
          tasks: {
            where: scope === 'assigned' ? { assigneeAdminId: actor.adminId } : undefined,
            select: { status: true },
          },
        },
      });
      const progressSeries = projects.map((project) => {
        const tasks = project.tasks;
        const done = tasks.filter((t) => t.status === 'COMPLETED').length;
        const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
        return { label: project.name, value: pct };
      });
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: progressSeries.length === 0,
        chart: { chartType: 'horizontal_bar', series: progressSeries },
      };
    }

    if (widgetKey === 'projects.delayed_table') {
      const delayedProjects = await this.prisma.project.findMany({
        where: {
          ...where,
          status: 'ACTIVE',
          expectedEndDate: { lt: today },
        },
        orderBy: { expectedEndDate: 'asc' },
        take: 8,
        select: { name: true, expectedEndDate: true, status: true },
      });
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: delayedProjects.length === 0,
        table: {
          columns: [
            { key: 'name', label: 'Project' },
            { key: 'due', label: 'Expected end' },
            { key: 'status', label: 'Status' },
          ],
          rows: delayedProjects.map((row) => ({
            name: row.name,
            due: row.expectedEndDate.toISOString().slice(0, 10),
            status: row.status,
          })),
        },
      };
    }

    if (widgetKey === 'projects.deadlines') {
      const upcoming = await this.prisma.project.findMany({
        where: { ...where, status: { in: ['ACTIVE', 'ON_HOLD'] } },
        orderBy: { expectedEndDate: 'asc' },
        take: 8,
        select: {
          name: true,
          status: true,
          expectedEndDate: true,
        },
      });
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: upcoming.length === 0,
        table: {
          columns: [
            { key: 'name', label: 'Project' },
            { key: 'status', label: 'Status' },
            { key: 'due', label: 'Due date' },
          ],
          rows: upcoming.map((row) => ({
            name: row.name,
            status: row.status,
            due: row.expectedEndDate.toISOString().slice(0, 10),
          })),
        },
      };
    }

    return { widgetKey, scope, empty: true, generatedAt };
  }

  private async loadEmployeesWidget(
    actor: OrgAccessActor,
    widgetKey: string,
    generatedAt: string,
    range: ResolvedDashboardDateRange,
  ): Promise<DashboardWidgetData> {
    const rangeFrom = range.dateFrom;
    const rangeTo = range.dateTo;
    const where = { organizationId: actor.organizationId, deactivatedAt: null };
    const [total, active, onLeave, inactive, newJoiners] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.count({ where: { ...where, employmentStatus: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { ...where, employmentStatus: 'ON_LEAVE' } }),
      this.prisma.employee.count({ where: { ...where, employmentStatus: 'INACTIVE' } }),
      this.prisma.employee.count({
        where: { ...where, dateOfJoining: { gte: rangeFrom, lte: rangeTo } },
      }),
    ]);

    if (widgetKey === 'employees.kpi') {
      // Total employees = CURRENT headcount (not date-filtered). Employees who joined during
      // the selected period are reported separately as `secondary`, never added to the total.
      const joinerRows = trendWindowCoversRange(range)
        ? await this.prisma.employee.findMany({
            where: { ...where, dateOfJoining: { gte: rangeFrom, lte: rangeTo } },
            select: { dateOfJoining: true },
          })
        : null;
      const joinersByDay = new Map<string, number>();
      for (const row of joinerRows ?? []) {
        const key = utcDateToCalendarKey(row.dateOfJoining);
        joinersByDay.set(key, (joinersByDay.get(key) ?? 0) + 1);
      }
      return {
        widgetKey,
        scope: 'organization',
        generatedAt,
        empty: total === 0,
        kpis: [
          buildPeriodKpiMetric({
            label: 'Total employees',
            value: total,
            caption: 'Current headcount',
            comparison: null,
            secondary: { label: 'Joined in period', value: newJoiners },
            ...(joinerRows
              ? {
                  dailyTrend: trendDaysForRange(range).map(
                    (day) => joinersByDay.get(utcDateToCalendarKey(day)) ?? 0,
                  ),
                }
              : {}),
            primary: true,
          }),
          { label: 'Active employees', value: active },
          { label: 'Inactive employees', value: inactive },
          { label: 'New joiners', value: newJoiners },
          { label: 'On leave', value: onLeave },
        ],
      };
    }

    if (widgetKey === 'employees.joining_trend') {
      const series: DashboardChartPayload['series'][number][] = [];
      const months = new Map<string, number>();
      const rows = await this.prisma.employee.findMany({
        where: { ...where, dateOfJoining: { gte: rangeFrom, lte: rangeTo } },
        select: { dateOfJoining: true },
      });
      for (const row of rows) {
        const key = row.dateOfJoining.toISOString().slice(0, 7);
        months.set(key, (months.get(key) ?? 0) + 1);
      }
      for (const [label, value] of [...months.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        series.push({ label, value });
      }
      return {
        widgetKey,
        scope: 'organization',
        generatedAt,
        empty: series.length === 0,
        chart: { chartType: 'line', series },
      };
    }

    const groups = await this.prisma.employee.groupBy({
      by: ['department'],
      where,
      _count: { _all: true },
    });
    const series = groups
      .map((g) => ({
        label: g.department?.trim() || 'Unassigned',
        value: g._count._all,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
    return {
      widgetKey,
      scope: 'organization',
      generatedAt,
      empty: series.length === 0,
      chart: { chartType: 'bar', series },
    };
  }

  private async loadAttendanceWidget(
    actor: OrgAccessActor,
    widgetKey: string,
    scope: DashboardDataScopeKind | null,
    range: ResolvedDashboardDateRange,
    generatedAt: string,
  ): Promise<DashboardWidgetData> {
    const employeeId = scope === 'own' ? await this.sessionEmployeeId(actor) : null;
    const where: Prisma.AttendanceRecordWhereInput = {
      organizationId: actor.organizationId,
      attendanceDate: { gte: range.dateFrom, lte: range.dateTo },
      ...(employeeId ? { employeeId } : {}),
    };
    const periodWhere = where;
    const [present, absent, late, onLeaveToday] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { ...periodWhere, status: 'PRESENT' } }),
      this.prisma.attendanceRecord.count({ where: { ...periodWhere, status: 'ABSENT' } }),
      this.prisma.attendanceRecord.count({ where: { ...periodWhere, status: 'LATE' } }),
      this.prisma.attendanceRecord.count({ where: { ...periodWhere, status: 'ON_LEAVE' } }),
    ]);

    if (widgetKey === 'attendance.kpi') {
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: present + absent + late + onLeaveToday === 0,
        kpis: [
          { label: 'Present', value: present },
          { label: 'Absent', value: absent },
          { label: 'Late', value: late },
          { label: 'On leave', value: onLeaveToday },
        ],
      };
    }

    if (widgetKey === 'attendance.status_chart') {
      const statuses = ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE', 'HALF_DAY'] as const;
      const series: DashboardChartPayload['series'][number][] = [];
      for (const status of statuses) {
        const value = await this.prisma.attendanceRecord.count({
          where: { ...periodWhere, status },
        });
        if (value > 0) series.push({ label: status.replace('_', ' '), value });
      }
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: series.length === 0,
        chart: { chartType: 'donut', series },
      };
    }

    if (widgetKey === 'attendance.dept_chart') {
      const records = await this.prisma.attendanceRecord.findMany({
        where: {
          ...periodWhere,
          status: { in: ['PRESENT', 'LATE'] },
        },
        select: {
          historicalIdentity: { select: { department: true } },
        },
        take: 500,
      });
      const tallies = new Map<string, number>();
      for (const record of records) {
        const dept = record.historicalIdentity?.department?.trim() || 'Unassigned';
        tallies.set(dept, (tallies.get(dept) ?? 0) + 1);
      }
      const series = [...tallies.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: series.length === 0,
        chart: { chartType: 'horizontal_bar', series },
      };
    }

    if (widgetKey === 'attendance.trend_chart') {
      const grouped = await this.prisma.attendanceRecord.groupBy({
        by: ['attendanceDate', 'status'],
        where,
        _count: { _all: true },
      });
      const byDate = new Map<string, { present: number; absent: number }>();
      for (const row of grouped) {
        const key = row.attendanceDate.toISOString().slice(0, 10);
        const bucket = byDate.get(key) ?? { present: 0, absent: 0 };
        if (row.status === 'PRESENT' || row.status === 'LATE') bucket.present += row._count._all;
        if (row.status === 'ABSENT') bucket.absent += row._count._all;
        byDate.set(key, bucket);
      }
      const presentSeries = [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([label, values]) => ({ label: label.slice(5), value: values.present }));
      const absentSeries = [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([label, values]) => ({ label: label.slice(5), value: values.absent }));
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: presentSeries.length === 0,
        chart: {
          chartType: 'line',
          series: [],
          multiSeries: [
            { name: 'Present', points: presentSeries },
            { name: 'Absent', points: absentSeries },
          ],
        },
      };
    }

    return { widgetKey, scope, empty: true, generatedAt };
  }

  private async loadLeaveWidget(
    actor: OrgAccessActor,
    widgetKey: string,
    scope: DashboardDataScopeKind | null,
    range: ResolvedDashboardDateRange,
    generatedAt: string,
  ): Promise<DashboardWidgetData> {
    const employeeId = scope === 'own' ? await this.sessionEmployeeId(actor) : null;
    const periodFilter = {
      createdAt: { gte: range.instantFrom, lt: range.instantTo },
    };
    const requestWhere: Prisma.LeaveRequestWhereInput = {
      organizationId: actor.organizationId,
      ...(employeeId ? { employeeId } : {}),
    };
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.leaveRequest.count({
        where: { ...requestWhere, ...periodFilter, status: 'PENDING' },
      }),
      this.prisma.leaveRequest.count({
        where: { ...requestWhere, ...periodFilter, status: 'APPROVED' },
      }),
      this.prisma.leaveRequest.count({
        where: { ...requestWhere, ...periodFilter, status: 'REJECTED' },
      }),
    ]);

    if (widgetKey === 'leave.kpi') {
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: pending + approved + rejected === 0,
        kpis: [
          { label: 'Pending requests', value: pending },
          { label: 'Approved requests', value: approved },
          { label: 'Rejected requests', value: rejected },
        ],
      };
    }

    if (widgetKey === 'leave.type_chart') {
      const byType = await this.prisma.leaveRequest.groupBy({
        by: ['leaveTypeId'],
        where: { ...requestWhere, status: 'APPROVED' },
        _count: { _all: true },
      });
      const types = await this.prisma.leaveType.findMany({
        where: { organizationId: actor.organizationId, id: { in: byType.map((t) => t.leaveTypeId) } },
        select: { id: true, name: true },
      });
      const typeName = new Map(types.map((t) => [t.id, t.name]));
      const series = byType.map((row) => ({
        label: typeName.get(row.leaveTypeId) ?? 'Leave',
        value: row._count._all,
      }));
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: series.length === 0,
        chart: { chartType: 'donut', series },
      };
    }

    if (widgetKey === 'leave.trend_chart') {
      const series: DashboardChartPayload['series'][number][] = [];
      const months = new Map<string, number>();
      const approved = await this.prisma.leaveRequest.findMany({
        where: {
          ...requestWhere,
          status: 'APPROVED',
          updatedAt: { gte: range.instantFrom, lt: range.instantTo },
        },
        select: { updatedAt: true },
        take: 1000,
      });
      for (const row of approved) {
        const key = row.updatedAt.toISOString().slice(0, 7);
        months.set(key, (months.get(key) ?? 0) + 1);
      }
      for (const [label, value] of [...months.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        series.push({ label, value });
      }
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: series.length === 0,
        chart: { chartType: 'area', series },
      };
    }

    return { widgetKey, scope, empty: true, generatedAt };
  }

  private async loadReportsWidget(
    actor: OrgAccessActor,
    scope: DashboardDataScopeKind | null,
    generatedAt: string,
  ): Promise<DashboardWidgetData> {
    const [tasks, leads, projects] = await Promise.all([
      this.prisma.dailyTask.count({ where: { organizationId: actor.organizationId } }),
      this.prisma.lead.count({ where: { organizationId: actor.organizationId, archivedAt: null } }),
      this.prisma.project.count({ where: { organizationId: actor.organizationId } }),
    ]);
    return {
      widgetKey: 'reports.performance',
      scope,
      generatedAt,
      empty: tasks + leads + projects === 0,
      chart: {
        chartType: 'bar',
        series: [
          { label: 'Tasks', value: tasks },
          { label: 'Leads', value: leads },
          { label: 'Projects', value: projects },
        ],
      },
    };
  }
}