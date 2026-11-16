import type { PermissionKey } from './permissions.js';

export const DASHBOARD_VIEW: PermissionKey = 'dashboard.view';

export const DASHBOARD_OVERVIEW_SUMMARY: PermissionKey = 'dashboard.overview.summary';

export const DASHBOARD_TASKS_SUMMARY: PermissionKey = 'dashboard.tasks.summary';
export const DASHBOARD_TASKS_ALL: PermissionKey = 'dashboard.tasks.all';
export const DASHBOARD_TASKS_TEAM: PermissionKey = 'dashboard.tasks.team';
export const DASHBOARD_TASKS_ASSIGNED: PermissionKey = 'dashboard.tasks.assigned';

export const DASHBOARD_CRM_SUMMARY: PermissionKey = 'dashboard.crm.summary';
export const DASHBOARD_CRM_LEADS_ALL: PermissionKey = 'dashboard.crm.leads.all';
export const DASHBOARD_CRM_LEADS_TEAM: PermissionKey = 'dashboard.crm.leads.team';
export const DASHBOARD_CRM_LEADS_ASSIGNED: PermissionKey = 'dashboard.crm.leads.assigned';

export const DASHBOARD_PROJECTS_SUMMARY: PermissionKey = 'dashboard.projects.summary';
export const DASHBOARD_PROJECTS_ALL: PermissionKey = 'dashboard.projects.all';
export const DASHBOARD_PROJECTS_ASSIGNED: PermissionKey = 'dashboard.projects.assigned';
export const DASHBOARD_PROJECTS_PROGRESS: PermissionKey = 'dashboard.projects.progress';

export const DASHBOARD_EMPLOYEES_SUMMARY: PermissionKey = 'dashboard.employees.summary';
export const DASHBOARD_EMPLOYEES_STATISTICS: PermissionKey = 'dashboard.employees.statistics';

export const DASHBOARD_ATTENDANCE_SUMMARY: PermissionKey = 'dashboard.attendance.summary';
export const DASHBOARD_ATTENDANCE_TEAM: PermissionKey = 'dashboard.attendance.team';
export const DASHBOARD_ATTENDANCE_OWN: PermissionKey = 'dashboard.attendance.own';

export const DASHBOARD_LEAVE_SUMMARY: PermissionKey = 'dashboard.leave.summary';
export const DASHBOARD_LEAVE_REQUESTS_ALL: PermissionKey = 'dashboard.leave.requests.all';
export const DASHBOARD_LEAVE_OWN: PermissionKey = 'dashboard.leave.own';
export const DASHBOARD_LEAVE_BALANCE: PermissionKey = 'dashboard.leave.balance';

export const DASHBOARD_FINANCE_SUMMARY: PermissionKey = 'dashboard.finance.summary';
export const DASHBOARD_FINANCE_REVENUE: PermissionKey = 'dashboard.finance.revenue';
export const DASHBOARD_FINANCE_EXPENSE: PermissionKey = 'dashboard.finance.expense';
export const DASHBOARD_FINANCE_OUTSTANDING: PermissionKey = 'dashboard.finance.outstanding';

export const DASHBOARD_REPORTS_SUMMARY: PermissionKey = 'dashboard.reports.summary';
export const DASHBOARD_REPORTS_PERFORMANCE: PermissionKey = 'dashboard.reports.performance';

export const DASHBOARD_PERMISSION_KEYS = [
  DASHBOARD_VIEW,
  DASHBOARD_OVERVIEW_SUMMARY,
  DASHBOARD_TASKS_SUMMARY,
  DASHBOARD_TASKS_ALL,
  DASHBOARD_TASKS_TEAM,
  DASHBOARD_TASKS_ASSIGNED,
  DASHBOARD_CRM_SUMMARY,
  DASHBOARD_CRM_LEADS_ALL,
  DASHBOARD_CRM_LEADS_TEAM,
  DASHBOARD_CRM_LEADS_ASSIGNED,
  DASHBOARD_PROJECTS_SUMMARY,
  DASHBOARD_PROJECTS_ALL,
  DASHBOARD_PROJECTS_ASSIGNED,
  DASHBOARD_PROJECTS_PROGRESS,
  DASHBOARD_EMPLOYEES_SUMMARY,
  DASHBOARD_EMPLOYEES_STATISTICS,
  DASHBOARD_ATTENDANCE_SUMMARY,
  DASHBOARD_ATTENDANCE_TEAM,
  DASHBOARD_ATTENDANCE_OWN,
  DASHBOARD_LEAVE_SUMMARY,
  DASHBOARD_LEAVE_REQUESTS_ALL,
  DASHBOARD_LEAVE_OWN,
  DASHBOARD_LEAVE_BALANCE,
  DASHBOARD_FINANCE_SUMMARY,
  DASHBOARD_FINANCE_REVENUE,
  DASHBOARD_FINANCE_EXPENSE,
  DASHBOARD_FINANCE_OUTSTANDING,
  DASHBOARD_REPORTS_SUMMARY,
  DASHBOARD_REPORTS_PERFORMANCE,
] as const satisfies readonly PermissionKey[];

export function hasDashboardPermission(
  effective: ReadonlySet<PermissionKey>,
  key: PermissionKey,
): boolean {
  return effective.has(key);
}

export function canAccessDashboardPage(effective: ReadonlySet<PermissionKey>): boolean {
  return hasDashboardPermission(effective, DASHBOARD_VIEW);
}