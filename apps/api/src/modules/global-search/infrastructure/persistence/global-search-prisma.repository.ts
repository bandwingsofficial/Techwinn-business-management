import { Inject, Injectable } from '@nestjs/common';
import type { GlobalSearchCategory, GlobalSearchResultItem } from '#contracts';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { dailyTaskAssignedToEmployeeIdWhere } from '../../../../lib/persistence/employee-platform-admin-link.js';
import type {
  GlobalSearchExecutionContext,
  GlobalSearchQueryInput,
} from '../../domain/global-search.types.js';

const CATEGORY_LABEL: Record<GlobalSearchCategory, string> = {
  daily_task: 'Daily Tasks',
  employee: 'Employees',
  employee_profile: 'Profile',
  attendance: 'Attendance',
  lead: 'Leads',
  client: 'Clients',
  project: 'Projects',
  project_task: 'Project Tasks',
  service_package: 'Service Packages',
  proposal: 'Proposals',
};

function textOrFields(term: string): Prisma.StringFilter<'DailyTask'> {
  return { contains: term, mode: 'insensitive' };
}

function formatDay(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class GlobalSearchPrismaRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async search(
    ctx: GlobalSearchExecutionContext,
    query: GlobalSearchQueryInput,
  ): Promise<GlobalSearchResultItem[]> {
    const term = query.q.trim();
    const categories = query.category
      ? [query.category]
      : [...ctx.allowedCategories].filter((c) => CATEGORY_LABEL[c]);

    const perCategoryTake = query.category
      ? query.limit
      : Math.max(2, Math.min(5, Math.ceil(query.limit / Math.max(categories.length, 1))));

  const fetchers: Array<Promise<GlobalSearchResultItem[]>> = [];

    for (const category of categories) {
      if (!ctx.allowedCategories.has(category)) continue;
      switch (category) {
        case 'daily_task':
          fetchers.push(this.searchDailyTasks(ctx, term, perCategoryTake));
          break;
        case 'employee':
          fetchers.push(this.searchEmployees(ctx, term, perCategoryTake));
          break;
        case 'employee_profile':
          fetchers.push(this.searchOwnProfile(ctx, term, perCategoryTake));
          break;
        case 'attendance':
          fetchers.push(this.searchAttendance(ctx, term, perCategoryTake));
          break;
        case 'lead':
          fetchers.push(this.searchLeads(ctx, term, perCategoryTake));
          break;
        case 'client':
          fetchers.push(this.searchClients(ctx, term, perCategoryTake));
          break;
        case 'project':
          fetchers.push(this.searchProjects(ctx, term, perCategoryTake));
          break;
        case 'project_task':
          fetchers.push(this.searchProjectTasks(ctx, term, perCategoryTake));
          break;
        case 'service_package':
          fetchers.push(this.searchServicePackages(ctx, term, perCategoryTake));
          break;
        case 'proposal':
          fetchers.push(this.searchProposals(ctx, term, perCategoryTake));
          break;
        default:
          break;
      }
    }

    const chunks = await Promise.all(fetchers);
    const merged = chunks.flat();
    return merged.slice(0, query.limit);
  }

  private searchDailyTasks(
    ctx: GlobalSearchExecutionContext,
    term: string,
    take: number,
  ): Promise<GlobalSearchResultItem[]> {
    const { organizationId, adminId } = ctx.actor;
    const where: Prisma.DailyTaskWhereInput = {
      organizationId,
      OR: [
        { title: textOrFields(term) },
        ...(ctx.scope.dailyTasksIncludeDescription ? [{ description: textOrFields(term) }] : []),
      ],
    };
    if (ctx.scope.dailyTasksOwnOnly) {
      if (!ctx.sessionEmployeeId) return Promise.resolve([]);
      Object.assign(where, dailyTaskAssignedToEmployeeIdWhere(ctx.sessionEmployeeId));
    }
    const basePath = ctx.scope.dailyTasksOwnOnly
      ? '/admin/daily-tasks/my'
      : '/admin/daily-tasks';

    return this.prisma.dailyTask
      .findMany({
        where,
        take,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          dueDate: true,
          workflowStage: { select: { name: true } },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          type: 'daily_task' as const,
          title: row.title,
          description:
            ctx.scope.dailyTasksIncludeDescription && row.description.trim()
              ? row.description.slice(0, 160)
              : undefined,
          subtitle: [row.workflowStage?.name, formatDay(row.dueDate)].filter(Boolean).join(' · '),
          url: `${basePath}?focus=board&taskId=${encodeURIComponent(row.id)}`,
          icon: 'task',
        })),
      );
  }

  private searchEmployees(
    ctx: GlobalSearchExecutionContext,
    term: string,
    take: number,
  ): Promise<GlobalSearchResultItem[]> {
    return this.prisma.employee
      .findMany({
        where: {
          organizationId: ctx.actor.organizationId,
          deletedAt: null,
          OR: [
            { displayName: { contains: term, mode: 'insensitive' } },
            { employeeCode: { contains: term, mode: 'insensitive' } },
            { workEmail: { contains: term, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: { displayName: 'asc' },
        select: { id: true, displayName: true, employeeCode: true, jobTitle: true },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          type: 'employee' as const,
          title: row.displayName,
          subtitle: [row.employeeCode, row.jobTitle].filter(Boolean).join(' · '),
          url: `/admin/employees?employeeId=${encodeURIComponent(row.id)}`,
          icon: 'user',
        })),
      );
  }

  private searchOwnProfile(
    ctx: GlobalSearchExecutionContext,
    term: string,
    take: number,
  ): Promise<GlobalSearchResultItem[]> {
    if (!ctx.sessionEmployeeId) return Promise.resolve([]);
    return this.prisma.employee
      .findFirst({
        where: {
          id: ctx.sessionEmployeeId,
          organizationId: ctx.actor.organizationId,
          deletedAt: null,
          OR: [
            { displayName: { contains: term, mode: 'insensitive' } },
            { employeeCode: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, displayName: true, employeeCode: true, jobTitle: true },
      })
      .then((row) =>
        row
          ? [
              {
                id: row.id,
                type: 'employee_profile' as const,
                title: row.displayName,
                subtitle: `${row.employeeCode} · Your profile`,
                url: '/project-manager/profile',
                icon: 'user',
              },
            ]
          : [],
      )
      .then((items) => items.slice(0, take));
  }

  private searchAttendance(
    ctx: GlobalSearchExecutionContext,
    term: string,
    take: number,
  ): Promise<GlobalSearchResultItem[]> {
    const where: Prisma.AttendanceRecordWhereInput = {
      organizationId: ctx.actor.organizationId,
    };
    if (ctx.scope.attendanceOwnOnly) {
      if (!ctx.sessionEmployeeId) return Promise.resolve([]);
      where.employeeId = ctx.sessionEmployeeId;
    } else if (!ctx.actor.isPlatformSuperAdmin) {
      // Org viewers may filter by identity text only within org scope.
    }

    const identityFilter: Prisma.EmployeeHistoricalIdentityWhereInput | undefined = ctx.scope
      .attendanceOwnOnly
      ? undefined
      : {
          OR: [
            { displayName: { contains: term, mode: 'insensitive' } },
            { employeeCode: { contains: term, mode: 'insensitive' } },
          ],
        };

    if (ctx.scope.attendanceOwnOnly) {
      const attendanceStatuses = ['PENDING', 'PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'HALF_DAY'] as const;
      const matched = attendanceStatuses.find((s) => s.toLowerCase().includes(term.toLowerCase()));
      if (matched) where.status = matched;
      const day = /^\d{4}-\d{2}-\d{2}$/.test(term) ? new Date(`${term}T00:00:00.000Z`) : null;
      if (day) where.attendanceDate = day;
      if (!matched && !day) {
        return Promise.resolve([]);
      }
    } else if (identityFilter) {
      where.historicalIdentity = identityFilter;
    }

    const path = ctx.scope.attendanceOwnOnly
      ? '/admin/attendance/punch'
      : '/admin/attendance';

    return this.prisma.attendanceRecord
      .findMany({
        where,
        take,
        orderBy: [{ attendanceDate: 'desc' }],
        select: {
          id: true,
          attendanceDate: true,
          status: true,
          punchInAt: true,
          historicalIdentity: { select: { displayName: true } },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          type: 'attendance' as const,
          title: ctx.scope.attendanceOwnOnly
            ? `Attendance ${formatDay(row.attendanceDate) ?? ''}`
            : row.historicalIdentity.displayName,
          subtitle: `${row.status} · ${formatDay(row.attendanceDate) ?? ''}`,
          url: path,
          icon: 'clock',
        })),
      );
  }

  private searchLeads(ctx: GlobalSearchExecutionContext, term: string, take: number) {
    return this.prisma.lead
      .findMany({
        where: {
          organizationId: ctx.actor.organizationId,
          archivedAt: null,
          OR: [
            { fullName: { contains: term, mode: 'insensitive' } },
            { companyName: { contains: term, mode: 'insensitive' } },
            { referenceNumber: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          companyName: true,
          referenceNumber: true,
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          type: 'lead' as const,
          title: row.fullName,
          subtitle: [row.referenceNumber, row.companyName].filter(Boolean).join(' · '),
          url: '/admin/leads',
          icon: 'target',
        })),
      );
  }

  private searchClients(ctx: GlobalSearchExecutionContext, term: string, take: number) {
    return this.prisma.client
      .findMany({
        where: {
          organizationId: ctx.actor.organizationId,
          archivedAt: null,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { referenceNumber: { contains: term, mode: 'insensitive' } },
            { primaryContact: { contains: term, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, referenceNumber: true },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          type: 'client' as const,
          title: row.name,
          subtitle: row.referenceNumber,
          url: '/admin/clients',
          icon: 'building',
        })),
      );
  }

  private searchProjects(ctx: GlobalSearchExecutionContext, term: string, take: number) {
    return this.prisma.project
      .findMany({
        where: {
          organizationId: ctx.actor.organizationId,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { projectNumber: { contains: term, mode: 'insensitive' } },
            { clientName: { contains: term, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, projectNumber: true, status: true },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          type: 'project' as const,
          title: row.name,
          subtitle: `${row.projectNumber} · ${row.status}`,
          url: '/admin/projects',
          icon: 'folder',
        })),
      );
  }

  private searchProjectTasks(ctx: GlobalSearchExecutionContext, term: string, take: number) {
    const where: Prisma.ProjectTaskWhereInput = {
      organizationId: ctx.actor.organizationId,
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    };
    if (ctx.scope.projectTasksOwnOnly) {
      where.assigneeAdminId = ctx.actor.adminId;
    }
    return this.prisma.projectTask
      .findMany({
        where,
        take,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          projectId: true,
          project: { select: { name: true } },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          type: 'project_task' as const,
          title: row.title,
          subtitle: `${row.project.name} · ${row.status}`,
          url: `/admin/project-tasks?projectId=${encodeURIComponent(row.projectId)}&taskId=${encodeURIComponent(row.id)}`,
          icon: 'check-square',
        })),
      );
  }

  private searchServicePackages(ctx: GlobalSearchExecutionContext, term: string, take: number) {
    return this.prisma.servicePackage
      .findMany({
        where: {
          organizationId: ctx.actor.organizationId,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { code: { contains: term, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, code: true, status: true },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          type: 'service_package' as const,
          title: row.name,
          subtitle: `${row.code} · ${row.status}`,
          url: '/admin/packages',
          icon: 'package',
        })),
      );
  }

  private searchProposals(ctx: GlobalSearchExecutionContext, term: string, take: number) {
    return this.prisma.quotationDocument
      .findMany({
        where: {
          organizationId: ctx.actor.organizationId,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { documentNumber: { contains: term, mode: 'insensitive' } },
            { clientName: { contains: term, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, documentNumber: true, status: true, type: true },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          type: 'proposal' as const,
          title: row.title,
          subtitle: `${row.documentNumber} · ${row.status}`,
          url: row.type === 'PROPOSAL' ? '/admin/proposals' : '/admin/quotations',
          icon: 'file-text',
        })),
      );
  }
}

export { CATEGORY_LABEL };