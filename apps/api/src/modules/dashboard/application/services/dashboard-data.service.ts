import { Inject, Injectable } from '@nestjs/common';
import type {
  DashboardChartPayload,
  DashboardDataScopeKind,
  DashboardWidgetData,
} from '#contracts';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import type { OrgAccessActor } from '../../../org-access/application/shared/org-access-actor.js';
import type { Prisma } from '../../../../generated/prisma/client.js';

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatLeadSourceLabel(source: string): string {
  return source
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function eachDayIso(from: Date, to: Date, maxDays = 31): string[] {
  const days: string[] = [];
  const cursor = startOfDayUtc(from);
  const end = startOfDayUtc(to);
  while (cursor <= end && days.length < maxDays) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

@Injectable()
export class DashboardDataService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async loadWidget(
    actor: OrgAccessActor,
    widgetKey: string,
    scope: DashboardDataScopeKind | null,
    rangeFrom: Date,
    rangeTo: Date,
  ): Promise<DashboardWidgetData> {
    const generatedAt = new Date().toISOString();
    if (widgetKey === 'overview.welcome') {
      return { widgetKey, scope, empty: false, generatedAt, kpis: [] };
    }
    if (widgetKey.startsWith('tasks.')) {
      return this.loadTasksWidget(actor, widgetKey, scope, rangeFrom, rangeTo, generatedAt);
    }
    if (widgetKey.startsWith('crm.')) {
      return this.loadCrmWidget(actor, widgetKey, scope, rangeFrom, rangeTo, generatedAt);
    }
    if (widgetKey.startsWith('projects.')) {
      return this.loadProjectsWidget(actor, widgetKey, scope, generatedAt);
    }
    if (widgetKey.startsWith('employees.')) {
      return this.loadEmployeesWidget(actor, widgetKey, generatedAt, rangeFrom, rangeTo);
    }
    if (widgetKey.startsWith('attendance.')) {
      return this.loadAttendanceWidget(actor, widgetKey, scope, rangeFrom, rangeTo, generatedAt);
    }
    if (widgetKey.startsWith('leave.')) {
      return this.loadLeaveWidget(actor, widgetKey, scope, rangeFrom, rangeTo, generatedAt);
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

  private async loadTasksWidget(
    actor: OrgAccessActor,
    widgetKey: string,
    scope: DashboardDataScopeKind | null,
    rangeFrom: Date,
    rangeTo: Date,
    generatedAt: string,
  ): Promise<DashboardWidgetData> {
    const employeeId = await this.sessionEmployeeId(actor);
    const where = this.taskScopeWhere(actor, scope, employeeId);
    const today = startOfDayUtc(new Date());

    const [total, completedStages, recent] = await Promise.all([
      this.prisma.dailyTask.count({ where }),
      this.prisma.dailyTaskWorkflowStage.findMany({
        where: { organizationId: actor.organizationId, isCompletedStage: true },
        select: { id: true },
      }),
      this.prisma.dailyTask.findMany({
        where,
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

    const completedStageIds = new Set(completedStages.map((s) => s.id));
    const openWhere = {
      ...where,
      OR: [{ workflowStageId: null }, { workflowStageId: { notIn: [...completedStageIds] } }],
    };
    const [openCount, overdueCount, dueTodayCount, inProgressCount] = await Promise.all([
      this.prisma.dailyTask.count({ where: openWhere }),
      this.prisma.dailyTask.count({
        where: {
          ...openWhere,
          dueDate: { lt: today },
        },
      }),
      this.prisma.dailyTask.count({
        where: {
          ...openWhere,
          dueDate: today,
        },
      }),
      this.prisma.dailyTask.count({
        where: {
          ...openWhere,
          workflowStageId: { not: null },
        },
      }),
    ]);
    const completedCount = Math.max(0, total - openCount);
    const pendingCount = Math.max(0, openCount - overdueCount - dueTodayCount - inProgressCount);

    if (widgetKey === 'tasks.kpi') {
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: total === 0,
        kpis: [
          { label: 'Total tasks', value: total },
          { label: 'Pending tasks', value: pendingCount },
          { label: 'In progress', value: inProgressCount },
          { label: 'Completed', value: completedCount },
          { label: 'Overdue', value: overdueCount },
          { label: 'Due today', value: dueTodayCount },
        ],
      };
    }

    if (widgetKey === 'tasks.status_chart') {
      const rangeWhere = { ...where, assignDate: { gte: rangeFrom, lte: rangeTo } };
      const openWhereRange = {
        ...rangeWhere,
        OR: [{ workflowStageId: null }, { workflowStageId: { notIn: [...completedStageIds] } }],
      };

      const [
        totalInRange,
        completedInRange,
        overdueInRange,
        inProgressInRange,
        pendingInRange,
        notStartedInRange,
      ] = await Promise.all([
        this.prisma.dailyTask.count({ where: rangeWhere }),
        this.prisma.dailyTask.count({
          where: { ...rangeWhere, workflowStageId: { in: [...completedStageIds] } },
        }),
        this.prisma.dailyTask.count({
          where: { ...openWhereRange, dueDate: { lt: today } },
        }),
        this.prisma.dailyTask.count({
          where: {
            ...openWhereRange,
            workflowStageId: { not: null },
            OR: [{ dueDate: null }, { dueDate: { gte: today } }],
          },
        }),
        this.prisma.dailyTask.count({
          where: { ...openWhereRange, workflowStageId: null, dueDate: { gte: today } },
        }),
        this.prisma.dailyTask.count({
          where: { ...openWhereRange, workflowStageId: null, dueDate: null },
        }),
      ]);

      const series: DashboardChartPayload['series'][number][] = [
        { label: 'Completed', value: completedInRange },
        { label: 'In Progress', value: inProgressInRange },
        { label: 'Pending', value: pendingInRange },
        { label: 'Overdue', value: overdueInRange },
        { label: 'Not Started', value: notStartedInRange },
      ];

      const buckets: DashboardChartPayload = {
        chartType: 'donut',
        series,
        totalValue: totalInRange,
      };
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: totalInRange === 0,
        chart: buckets,
      };
    }

    if (widgetKey === 'tasks.trend_chart') {
      const created: DashboardChartPayload['series'][number][] = [];
      const completed: DashboardChartPayload['series'][number][] = [];
      for (const day of eachDayIso(rangeFrom, rangeTo)) {
        const start = new Date(`${day}T00:00:00.000Z`);
        const end = new Date(`${day}T23:59:59.999Z`);
        const createdCount = await this.prisma.dailyTask.count({
          where: { ...where, createdAt: { gte: start, lte: end } },
        });
        const completedCountDay = await this.prisma.dailyTask.count({
          where: { ...where, completedAt: { gte: start, lte: end } },
        });
        created.push({ label: day.slice(5), value: createdCount });
        completed.push({ label: day.slice(5), value: completedCountDay });
      }
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: created.every((p) => p.value === 0) && completed.every((p) => p.value === 0),
        chart: {
          chartType: 'line',
          series: [],
          multiSeries: [
            { name: 'Created', points: created },
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
    rangeFrom: Date,
    rangeTo: Date,
    generatedAt: string,
  ): Promise<DashboardWidgetData> {
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
        where: { ...where, createdAt: { gte: rangeFrom, lte: rangeTo } },
      }),
      this.prisma.lead.count({
        where: { ...where, convertedAt: { not: null } },
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
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: false,
        kpis: [
          { label: 'Total leads', value: total },
          { label: 'New leads', value: createdInRange },
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
      const series: DashboardChartPayload['series'][number][] = [];
      for (const day of eachDayIso(rangeFrom, rangeTo)) {
        const start = new Date(`${day}T00:00:00.000Z`);
        const end = new Date(`${day}T23:59:59.999Z`);
        const value = await this.prisma.lead.count({
          where: { ...where, createdAt: { gte: start, lte: end } },
        });
        series.push({ label: day.slice(5), value });
      }
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
      const created: DashboardChartPayload['series'][number][] = [];
      const convertedSeries: DashboardChartPayload['series'][number][] = [];
      for (const day of eachDayIso(rangeFrom, rangeTo)) {
        const start = new Date(`${day}T00:00:00.000Z`);
        const end = new Date(`${day}T23:59:59.999Z`);
        const newCount = await this.prisma.lead.count({
          where: { ...where, createdAt: { gte: start, lte: end } },
        });
        const convertedCount = await this.prisma.lead.count({
          where: { ...where, convertedAt: { gte: start, lte: end } },
        });
        created.push({ label: day.slice(5), value: newCount });
        convertedSeries.push({ label: day.slice(5), value: convertedCount });
      }
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
    generatedAt: string,
  ): Promise<DashboardWidgetData> {
    const where = this.projectScopeWhere(actor, scope);
    const today = startOfDayUtc(new Date());
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
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: total === 0,
        kpis: [
          { label: 'Total projects', value: total },
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
          tasks: { select: { status: true } },
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
    rangeFrom: Date,
    rangeTo: Date,
  ): Promise<DashboardWidgetData> {
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
      return {
        widgetKey,
        scope: 'organization',
        generatedAt,
        empty: total === 0,
        kpis: [
          { label: 'Total employees', value: total },
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
    rangeFrom: Date,
    rangeTo: Date,
    generatedAt: string,
  ): Promise<DashboardWidgetData> {
    const employeeId = scope === 'own' ? await this.sessionEmployeeId(actor) : null;
    const where: Prisma.AttendanceRecordWhereInput = {
      organizationId: actor.organizationId,
      attendanceDate: { gte: rangeFrom, lte: rangeTo },
      ...(employeeId ? { employeeId } : {}),
    };
    const today = startOfDayUtc(new Date());
    const todayWhere = { ...where, attendanceDate: today };
    const [present, absent, late, onLeaveToday] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { ...todayWhere, status: 'PRESENT' } }),
      this.prisma.attendanceRecord.count({ where: { ...todayWhere, status: 'ABSENT' } }),
      this.prisma.attendanceRecord.count({ where: { ...todayWhere, status: 'LATE' } }),
      this.prisma.attendanceRecord.count({ where: { ...todayWhere, status: 'ON_LEAVE' } }),
    ]);

    if (widgetKey === 'attendance.kpi') {
      return {
        widgetKey,
        scope,
        generatedAt,
        empty: present + absent + late + onLeaveToday === 0,
        kpis: [
          { label: 'Present today', value: present },
          { label: 'Absent today', value: absent },
          { label: 'Late today', value: late },
          { label: 'On leave today', value: onLeaveToday },
        ],
      };
    }

    if (widgetKey === 'attendance.status_chart') {
      const statuses = ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE', 'HALF_DAY'] as const;
      const series: DashboardChartPayload['series'][number][] = [];
      for (const status of statuses) {
        const value = await this.prisma.attendanceRecord.count({
          where: { ...todayWhere, status },
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
          ...todayWhere,
          status: { in: ['PRESENT', 'LATE'] },
        },
        select: {
          employee: { select: { department: true } },
        },
        take: 500,
      });
      const tallies = new Map<string, number>();
      for (const record of records) {
        const dept = record.employee?.department?.trim() || 'Unassigned';
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
    rangeFrom: Date,
    rangeTo: Date,
    generatedAt: string,
  ): Promise<DashboardWidgetData> {
    const employeeId = scope === 'own' ? await this.sessionEmployeeId(actor) : null;
    const requestWhere: Prisma.LeaveRequestWhereInput = {
      organizationId: actor.organizationId,
      ...(employeeId ? { employeeId } : {}),
    };
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.leaveRequest.count({ where: { ...requestWhere, status: 'PENDING' } }),
      this.prisma.leaveRequest.count({ where: { ...requestWhere, status: 'APPROVED' } }),
      this.prisma.leaveRequest.count({ where: { ...requestWhere, status: 'REJECTED' } }),
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
          updatedAt: { gte: rangeFrom, lte: rangeTo },
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