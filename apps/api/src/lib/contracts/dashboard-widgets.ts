import type { PermissionKey } from './permissions.js';
import type { DashboardDataScopeKind, DashboardWidgetDescriptor } from './dashboard.js';
import { isShippedDashboardWidget } from './dashboard-module-support.js';
import {
  DASHBOARD_ATTENDANCE_OWN,
  DASHBOARD_ATTENDANCE_SUMMARY,
  DASHBOARD_ATTENDANCE_TEAM,
  DASHBOARD_CRM_LEADS_ALL,
  DASHBOARD_CRM_LEADS_ASSIGNED,
  DASHBOARD_CRM_LEADS_TEAM,
  DASHBOARD_CRM_SUMMARY,
  DASHBOARD_EMPLOYEES_STATISTICS,
  DASHBOARD_EMPLOYEES_SUMMARY,
  DASHBOARD_LEAVE_BALANCE,
  DASHBOARD_LEAVE_OWN,
  DASHBOARD_LEAVE_REQUESTS_ALL,
  DASHBOARD_LEAVE_SUMMARY,
  DASHBOARD_OVERVIEW_SUMMARY,
  DASHBOARD_PROJECTS_ALL,
  DASHBOARD_PROJECTS_ASSIGNED,
  DASHBOARD_PROJECTS_PROGRESS,
  DASHBOARD_PROJECTS_SUMMARY,
  DASHBOARD_REPORTS_PERFORMANCE,
  DASHBOARD_REPORTS_SUMMARY,
  DASHBOARD_TASKS_ALL,
  DASHBOARD_TASKS_ASSIGNED,
  DASHBOARD_TASKS_SUMMARY,
  DASHBOARD_TASKS_TEAM,
  hasDashboardPermission,
} from './dashboard-permission-keys.js';
import {
  hasLeaveManagementPermission,
  LEAVE_MANAGEMENT_VIEW,
} from './leave-management-permission-keys.js';
import { canViewOwnDailyTasks } from './task-visibility.js';

export type DashboardWidgetDefinition = DashboardWidgetDescriptor & {
  readonly permissionKey: PermissionKey;
  readonly defaultOrder: number;
};

export function dashboardWidgetGridSpan(widget: DashboardWidgetDefinition): 1 | 2 | 3 | 4 {
  if (widget.gridColumnSpan) return widget.gridColumnSpan;
  switch (widget.size) {
    case 'sm':
      return 1;
    case 'md':
      return 2;
    case 'lg':
      return 2;
    case 'full':
      return 4;
    default:
      return 2;
  }
}

export const DASHBOARD_WIDGET_REGISTRY: readonly DashboardWidgetDefinition[] = [
  {
    key: 'overview.welcome',
    section: 'Overview',
    title: 'Workspace overview',
    description: 'High-level snapshot of enabled modules.',
    kind: 'section',
    size: 'full',
    permissionKey: DASHBOARD_OVERVIEW_SUMMARY,
    defaultOrder: 10,
  },
  {
    key: 'tasks.kpi',
    section: 'Daily Tasks',
    title: 'Task metrics',
    description: 'Key daily task indicators in your authorized scope.',
    kind: 'kpi',
    size: 'full',
    gridColumnSpan: 4,
    permissionKey: DASHBOARD_TASKS_SUMMARY,
    defaultOrder: 100,
  },
  {
    key: 'tasks.status_chart',
    section: 'Daily Tasks',
    title: 'Task status distribution',
    description: 'Status mix for tasks in the selected range.',
    kind: 'chart',
    size: 'md',
    gridColumnSpan: 2,
    chartHeight: 'lg',
    permissionKey: DASHBOARD_TASKS_SUMMARY,
    defaultOrder: 110,
  },
  {
    key: 'tasks.trend_chart',
    section: 'Daily Tasks',
    title: 'Task completion trend',
    description: 'Created vs completed tasks over time.',
    kind: 'chart',
    size: 'lg',
    gridColumnSpan: 2,
    chartHeight: 'lg',
    permissionKey: DASHBOARD_TASKS_SUMMARY,
    defaultOrder: 115,
  },
  {
    key: 'tasks.recent_table',
    section: 'Daily Tasks',
    title: 'Recent tasks',
    description: 'Recently updated tasks in your scope.',
    kind: 'table',
    size: 'full',
    gridColumnSpan: 4,
    permissionKey: DASHBOARD_TASKS_SUMMARY,
    defaultOrder: 130,
  },
  {
    key: 'crm.kpi',
    section: 'CRM',
    title: 'Lead metrics',
    description: 'Pipeline KPIs in your authorized scope.',
    kind: 'kpi',
    size: 'full',
    gridColumnSpan: 4,
    permissionKey: DASHBOARD_CRM_SUMMARY,
    defaultOrder: 200,
  },
  {
    key: 'crm.funnel_chart',
    section: 'CRM',
    title: 'Lead pipeline',
    description: 'Leads by pipeline stage.',
    kind: 'chart',
    size: 'md',
    gridColumnSpan: 2,
    chartHeight: 'lg',
    permissionKey: DASHBOARD_CRM_SUMMARY,
    defaultOrder: 210,
  },
  {
    key: 'crm.source_chart',
    section: 'CRM',
    title: 'Lead sources',
    description: 'Where leads originate.',
    kind: 'chart',
    size: 'md',
    gridColumnSpan: 2,
    chartHeight: 'md',
    permissionKey: DASHBOARD_CRM_SUMMARY,
    defaultOrder: 215,
  },
  {
    key: 'crm.trend_chart',
    section: 'CRM',
    title: 'Lead creation trend',
    description: 'New leads over time.',
    kind: 'chart',
    size: 'lg',
    gridColumnSpan: 2,
    chartHeight: 'md',
    permissionKey: DASHBOARD_CRM_SUMMARY,
    defaultOrder: 218,
  },
  {
    key: 'crm.pipeline_value',
    section: 'CRM',
    title: 'Pipeline value',
    description: 'Estimated value by stage when available.',
    kind: 'chart',
    size: 'lg',
    gridColumnSpan: 2,
    chartHeight: 'md',
    permissionKey: DASHBOARD_CRM_SUMMARY,
    defaultOrder: 220,
  },
  {
    key: 'projects.kpi',
    section: 'Projects',
    title: 'Project metrics',
    description: 'Portfolio KPIs in your scope.',
    kind: 'kpi',
    size: 'full',
    gridColumnSpan: 4,
    permissionKey: DASHBOARD_PROJECTS_SUMMARY,
    defaultOrder: 300,
  },
  {
    key: 'projects.status_chart',
    section: 'Projects',
    title: 'Project status',
    description: 'Projects grouped by status.',
    kind: 'chart',
    size: 'md',
    gridColumnSpan: 2,
    chartHeight: 'md',
    permissionKey: DASHBOARD_PROJECTS_SUMMARY,
    defaultOrder: 310,
  },
  {
    key: 'projects.progress',
    section: 'Projects',
    title: 'Project progress',
    description: 'Task completion % for permitted projects.',
    kind: 'chart',
    size: 'lg',
    gridColumnSpan: 2,
    chartHeight: 'lg',
    permissionKey: DASHBOARD_PROJECTS_PROGRESS,
    defaultOrder: 320,
  },
  {
    key: 'projects.deadlines',
    section: 'Projects',
    title: 'Upcoming deadlines',
    description: 'Projects due soon in your scope.',
    kind: 'table',
    size: 'md',
    gridColumnSpan: 2,
    permissionKey: DASHBOARD_PROJECTS_SUMMARY,
    defaultOrder: 325,
  },
  {
    key: 'employees.kpi',
    section: 'Employees',
    title: 'Workforce metrics',
    description: 'Headcount and status overview.',
    kind: 'kpi',
    size: 'full',
    gridColumnSpan: 4,
    permissionKey: DASHBOARD_EMPLOYEES_SUMMARY,
    defaultOrder: 400,
  },
  {
    key: 'employees.department_chart',
    section: 'Employees',
    title: 'Department distribution',
    description: 'Employees by department.',
    kind: 'chart',
    size: 'md',
    gridColumnSpan: 2,
    chartHeight: 'md',
    permissionKey: DASHBOARD_EMPLOYEES_STATISTICS,
    defaultOrder: 410,
  },
  {
    key: 'employees.joining_trend',
    section: 'Employees',
    title: 'Joining trend',
    description: 'New joiners over the last months.',
    kind: 'chart',
    size: 'md',
    gridColumnSpan: 2,
    chartHeight: 'md',
    permissionKey: DASHBOARD_EMPLOYEES_STATISTICS,
    defaultOrder: 415,
  },
  {
    key: 'attendance.kpi',
    section: 'Attendance',
    title: 'Attendance today',
    description: 'Today’s attendance snapshot.',
    kind: 'kpi',
    size: 'full',
    gridColumnSpan: 4,
    permissionKey: DASHBOARD_ATTENDANCE_SUMMARY,
    defaultOrder: 500,
  },
  {
    key: 'attendance.status_chart',
    section: 'Attendance',
    title: 'Attendance status',
    description: 'Today’s status distribution.',
    kind: 'chart',
    size: 'md',
    gridColumnSpan: 2,
    chartHeight: 'md',
    permissionKey: DASHBOARD_ATTENDANCE_SUMMARY,
    defaultOrder: 505,
  },
  {
    key: 'attendance.trend_chart',
    section: 'Attendance',
    title: 'Attendance trend',
    description: 'Present vs absent in range.',
    kind: 'chart',
    size: 'lg',
    gridColumnSpan: 2,
    chartHeight: 'lg',
    permissionKey: DASHBOARD_ATTENDANCE_SUMMARY,
    defaultOrder: 510,
  },
  {
    key: 'leave.kpi',
    section: 'Leave',
    title: 'Leave metrics',
    description: 'Request status overview.',
    kind: 'kpi',
    size: 'full',
    gridColumnSpan: 4,
    permissionKey: DASHBOARD_LEAVE_SUMMARY,
    defaultOrder: 600,
  },
  {
    key: 'leave.type_chart',
    section: 'Leave',
    title: 'Leave by type',
    description: 'Approved leave grouped by type.',
    kind: 'chart',
    size: 'md',
    gridColumnSpan: 2,
    chartHeight: 'md',
    permissionKey: DASHBOARD_LEAVE_SUMMARY,
    defaultOrder: 610,
  },
  {
    key: 'leave.trend_chart',
    section: 'Leave',
    title: 'Monthly leave trend',
    description: 'Approved leave requests over time.',
    kind: 'chart',
    size: 'md',
    gridColumnSpan: 2,
    chartHeight: 'md',
    permissionKey: DASHBOARD_LEAVE_SUMMARY,
    defaultOrder: 615,
  },
  {
    key: 'attendance.dept_chart',
    section: 'Attendance',
    title: 'Department attendance',
    description: 'Present headcount by department today.',
    kind: 'chart',
    size: 'md',
    gridColumnSpan: 2,
    chartHeight: 'md',
    permissionKey: DASHBOARD_ATTENDANCE_SUMMARY,
    defaultOrder: 515,
  },
  {
    key: 'crm.conversion_chart',
    section: 'CRM',
    title: 'Lead conversion trend',
    description: 'New vs converted leads over time.',
    kind: 'chart',
    size: 'md',
    gridColumnSpan: 2,
    chartHeight: 'md',
    permissionKey: DASHBOARD_CRM_SUMMARY,
    defaultOrder: 216,
  },
  {
    key: 'projects.delayed_table',
    section: 'Projects',
    title: 'Delayed projects',
    description: 'Active projects past their expected end date.',
    kind: 'table',
    size: 'md',
    gridColumnSpan: 2,
    permissionKey: DASHBOARD_PROJECTS_SUMMARY,
    defaultOrder: 328,
  },
  {
    key: 'reports.performance',
    section: 'Reports',
    title: 'Performance snapshot',
    description: 'Cross-module record counts.',
    kind: 'chart',
    size: 'lg',
    gridColumnSpan: 4,
    chartHeight: 'md',
    permissionKey: DASHBOARD_REPORTS_PERFORMANCE,
    defaultOrder: 800,
  },
] as const;

const TASK_SCOPE_PRIORITY: readonly {
  readonly permission: PermissionKey;
  readonly scope: DashboardDataScopeKind;
}[] = [
  { permission: DASHBOARD_TASKS_ASSIGNED, scope: 'assigned' },
  { permission: DASHBOARD_TASKS_TEAM, scope: 'team' },
  { permission: DASHBOARD_TASKS_ALL, scope: 'organization' },
];

const CRM_SCOPE_PRIORITY: readonly {
  readonly permission: PermissionKey;
  readonly scope: DashboardDataScopeKind;
}[] = [
  { permission: DASHBOARD_CRM_LEADS_ASSIGNED, scope: 'assigned' },
  { permission: DASHBOARD_CRM_LEADS_TEAM, scope: 'team' },
  { permission: DASHBOARD_CRM_LEADS_ALL, scope: 'organization' },
];

const PROJECT_SCOPE_PRIORITY: readonly {
  readonly permission: PermissionKey;
  readonly scope: DashboardDataScopeKind;
}[] = [
  { permission: DASHBOARD_PROJECTS_ASSIGNED, scope: 'assigned' },
  { permission: DASHBOARD_PROJECTS_ALL, scope: 'organization' },
];

const ATTENDANCE_SCOPE_PRIORITY: readonly {
  readonly permission: PermissionKey;
  readonly scope: DashboardDataScopeKind;
}[] = [
  { permission: DASHBOARD_ATTENDANCE_OWN, scope: 'own' },
  { permission: DASHBOARD_ATTENDANCE_TEAM, scope: 'team' },
];

const LEAVE_SCOPE_PRIORITY: readonly {
  readonly permission: PermissionKey;
  readonly scope: DashboardDataScopeKind;
}[] = [
  { permission: DASHBOARD_LEAVE_OWN, scope: 'own' },
  { permission: DASHBOARD_LEAVE_REQUESTS_ALL, scope: 'organization' },
];

const DASHBOARD_SCOPE_RANK: Record<DashboardDataScopeKind, number> = {
  organization: 4,
  team: 3,
  assigned: 2,
  own: 1,
};

/** When a member holds multiple dashboard scope permissions, use the broadest data scope. */
export function resolveBroadestDashboardScope(
  effective: ReadonlySet<PermissionKey>,
  candidates: readonly {
    readonly permission: PermissionKey;
    readonly scope: DashboardDataScopeKind;
  }[],
): DashboardDataScopeKind | null {
  let best: DashboardDataScopeKind | null = null;
  let bestRank = 0;
  for (const item of candidates) {
    if (!hasDashboardPermission(effective, item.permission)) continue;
    const rank = DASHBOARD_SCOPE_RANK[item.scope];
    if (rank > bestRank) {
      bestRank = rank;
      best = item.scope;
    }
  }
  return best;
}

export function resolveTaskDashboardScope(
  effective: ReadonlySet<PermissionKey>,
): DashboardDataScopeKind | null {
  return resolveBroadestDashboardScope(effective, TASK_SCOPE_PRIORITY);
}

export function resolveCrmDashboardScope(
  effective: ReadonlySet<PermissionKey>,
): DashboardDataScopeKind | null {
  return resolveBroadestDashboardScope(effective, CRM_SCOPE_PRIORITY);
}

export function resolveProjectDashboardScope(
  effective: ReadonlySet<PermissionKey>,
): DashboardDataScopeKind | null {
  return resolveBroadestDashboardScope(effective, PROJECT_SCOPE_PRIORITY);
}

export function resolveAttendanceDashboardScope(
  effective: ReadonlySet<PermissionKey>,
): DashboardDataScopeKind | null {
  const scoped = resolveBroadestDashboardScope(effective, ATTENDANCE_SCOPE_PRIORITY);
  if (scoped) return scoped;
  if (hasDashboardPermission(effective, DASHBOARD_ATTENDANCE_SUMMARY)) return 'organization';
  return null;
}

export function resolveLeaveDashboardScope(
  effective: ReadonlySet<PermissionKey>,
): DashboardDataScopeKind | null {
  return resolveBroadestDashboardScope(effective, LEAVE_SCOPE_PRIORITY);
}

export function dashboardWidgetByKey(key: string): DashboardWidgetDefinition | undefined {
  return DASHBOARD_WIDGET_REGISTRY.find((w) => w.key === key);
}

/**
 * Whether effective permissions include the underlying module access required to load
 * widget data (dashboard widget keys alone are insufficient).
 */
export function canAccessDashboardWidgetModuleData(
  effective: ReadonlySet<PermissionKey>,
  widgetKey: string,
): boolean {
  if (widgetKey.startsWith('overview.') || widgetKey.startsWith('reports.')) {
    return true;
  }
  if (widgetKey.startsWith('tasks.')) {
    const scope = resolveTaskDashboardScope(effective);
    if (!scope) return false;
    if (scope === 'assigned' && !canViewOwnDailyTasks(effective)) return false;
    return true;
  }
  if (widgetKey.startsWith('crm.')) {
    if (!effective.has('crm.leads.view') && !effective.has('leads.read')) {
      return false;
    }
    return resolveCrmDashboardScope(effective) !== null;
  }
  if (widgetKey.startsWith('projects.')) {
    if (!effective.has('projects.read')) return false;
    return resolveProjectDashboardScope(effective) !== null;
  }
  if (widgetKey.startsWith('employees.')) {
    return effective.has('employees.view') || effective.has('employees.read');
  }
  if (widgetKey.startsWith('attendance.')) {
    if (
      !effective.has('attendance.records.view') &&
      !effective.has('attendance.punch.view') &&
      !effective.has('attendance.view_summary')
    ) {
      return false;
    }
    return resolveAttendanceDashboardScope(effective) !== null;
  }
  if (widgetKey.startsWith('leave.')) {
    const own =
      effective.has('leave.requests.read_own') || effective.has('leave.balances.read_own');
    const admin = hasLeaveManagementPermission(effective, LEAVE_MANAGEMENT_VIEW);
    if (!own && !admin) return false;
    return resolveLeaveDashboardScope(effective) !== null;
  }
  return false;
}

export function permittedDashboardWidgets(
  effective: ReadonlySet<PermissionKey>,
): readonly DashboardWidgetDefinition[] {
  return DASHBOARD_WIDGET_REGISTRY.filter(
    (widget) =>
      isShippedDashboardWidget(widget.key) &&
      hasDashboardPermission(effective, widget.permissionKey),
  );
}

export const DASHBOARD_SCOPE_PERMISSION_KEYS = [
  DASHBOARD_TASKS_ALL,
  DASHBOARD_TASKS_TEAM,
  DASHBOARD_TASKS_ASSIGNED,
  DASHBOARD_CRM_LEADS_ALL,
  DASHBOARD_CRM_LEADS_TEAM,
  DASHBOARD_CRM_LEADS_ASSIGNED,
  DASHBOARD_PROJECTS_ALL,
  DASHBOARD_PROJECTS_ASSIGNED,
  DASHBOARD_ATTENDANCE_TEAM,
  DASHBOARD_ATTENDANCE_OWN,
  DASHBOARD_LEAVE_REQUESTS_ALL,
  DASHBOARD_LEAVE_OWN,
  DASHBOARD_LEAVE_BALANCE,
  DASHBOARD_REPORTS_SUMMARY,
] as const satisfies readonly PermissionKey[];