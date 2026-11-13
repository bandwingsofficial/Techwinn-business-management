import { hasUnrestrictedOrgPermissions, type PermissionKey } from '@techwin/contracts';
import { canViewOrganizationDailyTasks } from '@/features/admin/daily-tasks/utils/daily-tasks-organization-scope';
import {
  canAccessWorkspaceDashboard,
  canUseEmployeeSelfService,
  type MembershipAccessContext,
} from '@/features/auth/membership/membership-access';
import {
  canonicalPermissionPath,
  pathnamePortalSegment,
  portalDashboardPath,
} from '@/features/auth/portal/portal-segment';

/**
 * Organization daily-task boards — require org-scope view, not merely `tasks.read`
 * (Employee self-service uses `/employee/daily-tasks`).
 * `/admin/project-tasks` is intentionally excluded: `projects.read` / `tasks.read` via
 * {@link APP_ROUTE_PERMISSIONS} controls Projects & Tasks View independently.
 */
const ORGANIZATION_DAILY_TASK_BOARD_ROUTES: ReadonlySet<string> = new Set([
  '/admin/daily-tasks',
  '/admin/task-calendar',
  '/admin/my-tasks',
]);

/** Unified route → permission map for all authenticated app paths (`/admin` and `/employee`). */
export const APP_ROUTE_PERMISSIONS: Readonly<Record<string, readonly PermissionKey[]>> = {
  '/admin': [],
  '/admin/dashboard': [],
  '/admin/users': ['users.read'],
  '/admin/roles': ['roles.read'],
  '/admin/employees': ['employees.read'],
  '/admin/attendance': ['attendance.view_all', 'attendance.manage_settings'],
  /** Org calendar admin — not the employee self-service `/employee/calendar` (`calendar.view`). */
  '/admin/calendar': ['calendar.view_all', 'calendar.manage_holidays'],
  '/admin/leave-types': [
    'leave.types.read',
    'leave.types.create',
    'leave.types.update',
    'leave.types.manage',
  ],
  '/admin/leave-balances': [
    'leave.config.read',
    'leave.config.manage',
    'leave.allocations.read',
    'leave.allocations.manage',
    'leave.balances.read',
    'leave.balances.adjust',
  ],
  '/admin/employee-leave-records': [
    'leave.balances.read',
    'leave.config.read',
    'leave.config.manage',
  ],
  '/admin/leave': ['leave.requests.read_all'],
  '/admin/pipeline': ['crm.pipeline.view'],
  '/admin/leads': ['crm.leads.view'],
  '/admin/packages': ['crm.service_packages.view'],
  '/admin/quotations': ['leads.read'],
  '/admin/proposals': ['leads.read'],
  '/admin/clients': ['clients.read'],
  '/admin/projects': ['projects.read'],
  '/admin/project-tasks': ['tasks.read', 'projects.read'],
  '/admin/daily-tasks': ['tasks.read'],
  '/admin/my-tasks': ['tasks.read'],
  '/admin/task-calendar': ['tasks.read'],
  '/admin/whatsapp/inbox': ['whatsapp.read'],
  '/admin/whatsapp/channels': ['whatsapp.channels.manage'],
  '/admin/whatsapp/templates': ['whatsapp.templates.manage', 'whatsapp.broadcasts.manage'],
  '/admin/whatsapp/broadcasts': ['whatsapp.broadcasts.manage'],
  '/admin/whatsapp/reports': ['whatsapp.view_all', 'whatsapp.channels.manage'],
  '/employee': [],
  '/employee/dashboard': [
    'attendance.view_own',
    'leave.requests.read_own',
    'leave.balances.read_own',
    'leave.requests.create',
  ],
  '/employee/daily-tasks': ['tasks.read'],
  '/employee/task-calendar': ['tasks.read'],
  '/employee/attendance': ['attendance.view_own'],
  '/employee/calendar': ['calendar.view'],
  '/employee/leave': [
    'leave.requests.create',
    'leave.requests.read_own',
    'leave.requests.cancel',
    'leave.balances.read_own',
  ],
  '/project-manager': [],
  '/project-manager/dashboard': [],
  '/project-manager/profile': [],
  '/project-manager/pipeline': ['crm.pipeline.view'],
  '/project-manager/leads': ['crm.leads.view'],
  '/project-manager/packages': ['crm.service_packages.view'],
  '/project-manager/quotations': ['leads.read'],
  '/project-manager/proposals': ['leads.read'],
  '/project-manager/clients': ['clients.read'],
  '/project-manager/employees': ['employees.read'],
  '/project-manager/whatsapp/inbox': ['whatsapp.read'],
  '/project-manager/whatsapp/channels': ['whatsapp.channels.manage'],
  '/project-manager/whatsapp/templates': ['whatsapp.templates.manage', 'whatsapp.broadcasts.manage'],
  '/project-manager/whatsapp/broadcasts': ['whatsapp.broadcasts.manage'],
  '/project-manager/whatsapp/reports': ['whatsapp.view_all', 'whatsapp.channels.manage'],
};

/** Routes that require every listed permission (AND), not any (OR). */
export const APP_ROUTE_PERMISSIONS_ALL: Readonly<Record<string, readonly PermissionKey[]>> = {
  '/admin/leads': ['crm.pipeline.view', 'crm.leads.view'],
  '/project-manager/leads': ['crm.pipeline.view', 'crm.leads.view'],
};

const EXACT_ONLY_ROUTES: ReadonlySet<string> = new Set([
  '/admin',
  '/admin/dashboard',
  '/employee',
  '/employee/dashboard',
  '/project-manager',
  '/project-manager/dashboard',
  '/project-manager/profile',
]);

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function permissionsForAppPath(pathname: string): readonly PermissionKey[] | null {
  const path = normalizePath(pathname);
  const exact = APP_ROUTE_PERMISSIONS[path];
  if (exact) return exact;
  let best: { route: string; permissions: readonly PermissionKey[] } | null = null;
  for (const [route, permissions] of Object.entries(APP_ROUTE_PERMISSIONS)) {
    if (EXACT_ONLY_ROUTES.has(route) || !path.startsWith(`${route}/`)) continue;
    if (!best || route.length > best.route.length) best = { route, permissions };
  }
  return best?.permissions ?? null;
}

export function canAccessAppPath(
  pathname: string,
  permissions: ReadonlySet<PermissionKey>,
  access?: MembershipAccessContext,
  expectedPortalSegment?: string,
): boolean {
  const path = normalizePath(pathname);

  if (hasUnrestrictedOrgPermissions(permissions)) {
    if (expectedPortalSegment) {
      const pathPortal = pathnamePortalSegment(path);
      if (pathPortal && pathPortal !== expectedPortalSegment) {
        return false;
      }
    }
    if (access && (path === '/employee' || path.startsWith('/employee/'))) {
      return canUseEmployeeSelfService(access);
    }
    return true;
  }

  if (expectedPortalSegment) {
    const pathPortal = pathnamePortalSegment(path);
    if (pathPortal && pathPortal !== expectedPortalSegment) {
      return false;
    }
  }

  if (expectedPortalSegment && path === portalDashboardPath(expectedPortalSegment)) {
    if (expectedPortalSegment === 'admin' && access && !canAccessWorkspaceDashboard(access)) {
      return false;
    }
    if (expectedPortalSegment === 'employee' && access && !canUseEmployeeSelfService(access)) {
      return false;
    }
    return true;
  }

  if (access && (path === '/admin' || path === '/admin/dashboard')) {
    if (!canAccessWorkspaceDashboard(access)) return false;
  }

  if (access && (path === '/employee' || path.startsWith('/employee/'))) {
    if (!canUseEmployeeSelfService(access)) return false;
  }

  const canonical = canonicalPermissionPath(path);
  const matchedDailyBoardRoute = [...ORGANIZATION_DAILY_TASK_BOARD_ROUTES].find(
    (route) =>
      path === route ||
      path.startsWith(`${route}/`) ||
      canonical === route ||
      canonical.startsWith(`${route}/`),
  );
  if (matchedDailyBoardRoute) {
    return canViewOrganizationDailyTasks(
      (key) => permissions.has(key),
      (...keys) => keys.some((key) => permissions.has(key)),
    );
  }

  const allRequired =
    APP_ROUTE_PERMISSIONS_ALL[path] ?? APP_ROUTE_PERMISSIONS_ALL[canonical] ?? null;
  if (allRequired) {
    return allRequired.every((key) => permissions.has(key));
  }

  let required = permissionsForAppPath(path);
  if (required === null) {
    required = permissionsForAppPath(canonical);
  }
  if (required === null) {
    return false;
  }
  if (required.length === 0) {
    if (path === '/admin' || path === '/employee' || path === '/project-manager') return true;
    return false;
  }
  return required.some((key) => permissions.has(key));
}
