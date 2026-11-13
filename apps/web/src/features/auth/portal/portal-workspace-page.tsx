import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CrmLoadingRows } from '@/features/admin/crm/components/crm-feedback';
import { ClientsPage } from '@/features/admin/crm/components/clients-page';
import { ServicePackagesPage } from '@/features/admin/crm/components/service-packages-page';
import { AdminDailyTasksWorkspace } from '@/features/admin/daily-tasks/components/admin-daily-tasks-workspace';
import { DailyTasksHistoryPage } from '@/features/admin/daily-tasks/components/daily-tasks-history-page';
import { AdminAttendanceWorkspace } from '@/features/admin/attendance/components/admin-attendance-workspace';
import { AdminLeaveRequestsWorkspace } from '@/features/admin/leave/components/admin-leave-requests-workspace';
import { AdminOrgCalendarWorkspace } from '@/features/admin/org-calendar/components/admin-org-calendar-workspace';
import { RolesPage } from '@/features/admin/org-access/components/roles-page';
import { UsersPage } from '@/features/admin/org-access/components/users-page';
import { ProjectPlanningPage } from '@/features/admin/project-tasks/components/project-planning-page';
import { ProjectTaskBoardPage } from '@/features/admin/project-tasks/components/project-task-board-page';
import { ProjectTasksPage } from '@/features/admin/project-tasks/components/project-tasks-page';
import { WhatsAppBroadcastsPage } from '@/features/admin/whatsapp/components/whatsapp-broadcasts-page';
import { WhatsAppChannelsPage } from '@/features/admin/whatsapp/components/whatsapp-channels-page';
import { WhatsAppInboxPage } from '@/features/admin/whatsapp/components/whatsapp-inbox-page';
import { WhatsAppReportsPage } from '@/features/admin/whatsapp/components/whatsapp-reports-page';
import { WhatsAppTemplatesPage } from '@/features/admin/whatsapp/components/whatsapp-templates-page';
import { LeadsPage } from '@/features/crm/leads';
import { PipelinesPage } from '@/features/crm/pipelines/pages/pipelines-page';
import { QuotationPrintPage, QuotationsPage } from '@/features/crm/quotations';
import { EmployeesPage } from '@/features/employees/pages/employees-page';
import { EmployeeLeaveRecordsPage } from '@/features/employee-leave-records/pages/employee-leave-records-page';
import { LeaveBalancesPage } from '@/features/leave-balances/pages/leave-balances-page';
import { LeaveTypesPage } from '@/features/leave-types/pages/leave-types-page';
import { TaskCalendarPage } from '@/features/project-management/task-calendar';
const RESERVED_WORKSPACE_PORTALS: ReadonlySet<string> = new Set([
  'admin',
  'employee',
  'project-manager',
]);

type RouteRender = (portal: string) => ReactNode;

function tableSkeleton(height = 'h-64') {
  return (
    <div className="mx-auto grid max-w-6xl gap-3">
      <Skeleton className="h-10 w-48" />
      <Skeleton className={height + ' w-full'} />
    </div>
  );
}

function withSuspense(fallback: ReactNode, child: ReactNode): ReactNode {
  return <Suspense fallback={fallback}>{child}</Suspense>;
}

const STATIC_PORTAL_ROUTES: Readonly<Record<string, RouteRender>> = {
  roles: () =>
    withSuspense(tableSkeleton(), <RolesPage />),
  users: () =>
    withSuspense(tableSkeleton(), <UsersPage />),
  'leave-balances': () => <LeaveBalancesPage />,
  'leave-types': () => <LeaveTypesPage />,
  'employee-leave-records': () => <EmployeeLeaveRecordsPage />,
  employees: () =>
    withSuspense(tableSkeleton(), <EmployeesPage />),
  attendance: () =>
    withSuspense(tableSkeleton(), <AdminAttendanceWorkspace />),
  leave: () => <AdminLeaveRequestsWorkspace />,
  calendar: () =>
    withSuspense(tableSkeleton(), <AdminOrgCalendarWorkspace />),
  pipeline: () => <PipelinesPage />,
  leads: () =>
    withSuspense(tableSkeleton(), <LeadsPage />),
  clients: () =>
    withSuspense(tableSkeleton(), <ClientsPage />),
  packages: () =>
    withSuspense(tableSkeleton(), <ServicePackagesPage />),
  quotations: () => <QuotationsPage />,
  'project-tasks': () =>
    withSuspense(<CrmLoadingRows />, <ProjectTasksPage />),
  'daily-tasks': () =>
    withSuspense(tableSkeleton(), <AdminDailyTasksWorkspace />),
  'daily-tasks/history': () =>
    withSuspense(tableSkeleton(), <DailyTasksHistoryPage />),
  'task-calendar': () =>
    withSuspense(tableSkeleton(), <TaskCalendarPage />),
  'whatsapp/inbox': () =>
    withSuspense(tableSkeleton(), <WhatsAppInboxPage />),
  'whatsapp/channels': () =>
    withSuspense(tableSkeleton(), <WhatsAppChannelsPage />),
  'whatsapp/templates': () =>
    withSuspense(tableSkeleton(), <WhatsAppTemplatesPage />),
  'whatsapp/broadcasts': () =>
    withSuspense(tableSkeleton(), <WhatsAppBroadcastsPage />),
  'whatsapp/reports': () =>
    withSuspense(tableSkeleton(), <WhatsAppReportsPage />),
};

function isDynamicWorkspacePortal(portal: string): boolean {
  return !RESERVED_WORKSPACE_PORTALS.has(portal);
}

/**
 * Renders an existing admin workspace page under `/{portal}/...` without duplicating route files.
 */
export function renderPortalWorkspacePage(
  portal: string,
  segments: readonly string[],
): ReactNode | null {
  if (!isDynamicWorkspacePortal(portal)) return null;
  if (segments.length === 0) return null;

  const routeKey = segments.join('/');

  if (routeKey === 'projects') {
    redirect(`/${portal}/project-tasks`);
  }
  if (routeKey === 'my-tasks') {
    redirect(`/${portal}/daily-tasks?workspace=my`);
  }
  if (routeKey === 'proposals') {
    redirect(`/${portal}/quotations`);
  }

  const staticRender = STATIC_PORTAL_ROUTES[routeKey];
  if (staticRender) return staticRender(portal);

  const quotationPrint = /^quotations\/([^/]+)\/print$/.exec(routeKey);
  if (quotationPrint) {
    const quotationId = quotationPrint[1]!;
    return (
      <div className="p-4 md:p-6">
        <QuotationPrintPage quotationId={quotationId} />
      </div>
    );
  }

  const proposalPrint = /^proposals\/([^/]+)\/print$/.exec(routeKey);
  if (proposalPrint) {
    redirect(`/${portal}/quotations/${proposalPrint[1]}/print`);
  }

  const projectPlan = /^project-tasks\/([^/]+)\/plan$/.exec(routeKey);
  if (projectPlan) {
    return <ProjectPlanningPage projectId={projectPlan[1]!} />;
  }

  const projectBoard = /^project-tasks\/([^/]+)$/.exec(routeKey);
  if (projectBoard) {
    return <ProjectTaskBoardPage projectId={projectBoard[1]!} />;
  }

  return null;
}

/** Canonical admin workspace paths mirrored for dynamic portals (audit checklist). */
export const PORTAL_MIRROR_ADMIN_PATHS: readonly string[] = [
  ...Object.keys(STATIC_PORTAL_ROUTES),
  'projects',
  'my-tasks',
  'proposals',
  'project-tasks/:projectId',
  'project-tasks/:projectId/plan',
  'quotations/:id/print',
  'proposals/:id/print',
];
