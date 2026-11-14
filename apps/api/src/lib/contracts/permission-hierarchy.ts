import { CRM_PIPELINE_PERMISSION_KEYS } from './crm-pipeline-permissions.js';
import { CRM_LEADS_PERMISSION_KEYS, LEGACY_LEADS_PERMISSION_KEYS } from './crm-leads-permissions.js';
import { CRM_SERVICE_PACKAGES_PERMISSION_KEYS } from './crm-service-packages-permissions.js';
import { CRM_QUOTATIONS_PERMISSION_KEYS } from './crm-quotations-permissions.js';
import { CRM_CLIENTS_PERMISSION_KEYS, LEGACY_CLIENTS_PERMISSION_KEYS } from './crm-clients-permissions.js';
import {
  DAILY_TASKS_AUXILIARY_PERMISSION_KEYS,
  PM_DAILY_TASKS_PERMISSION_KEYS,
} from './pm-daily-tasks-permissions.js';
import { PM_TASK_CALENDAR_PERMISSION_KEYS } from './pm-task-calendar-permissions.js';
import { LEGACY_ORG_CALENDAR_PERMISSION_KEYS } from './org-calendar-permission-keys.js';
import { PROJECT_PERMISSION_KEYS, TASK_PERMISSION_KEYS } from './projects-permissions.js';
import { EMPLOYEES_HIERARCHY_EXCLUDED_KEYS } from './employees-permissions.js';
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
  type PermissionDefinition,
  type PermissionKey,
} from './permissions.js';

/** Sidebar-aligned page bucket for grouping catalog permissions in the role editor. */
export type PermissionHierarchyPage = {
  readonly id: string;
  readonly label: string;
  /** Route when the page exists in admin nav; omitted for cross-cutting resources. */
  readonly href?: string;
  /** Permission keys enforced for this page (may overlap other pages when backend shares keys). */
  readonly permissionKeys: readonly PermissionKey[];
};

export type PermissionHierarchyGroup = {
  readonly id: string;
  readonly label: string;
  readonly pages: readonly PermissionHierarchyPage[];
};

export type PermissionHierarchyModule = {
  readonly id: string;
  readonly label: string;
  readonly groups: readonly PermissionHierarchyGroup[];
};

/**
 * Admin sidebar–aligned permission hierarchy. Keys must exist in {@link PERMISSION_KEYS}.
 * Page groupings reflect live routes and API `@RequirePermissions` usage.
 */
export const PERMISSION_HIERARCHY: readonly PermissionHierarchyModule[] = [
  {
    id: 'overview',
    label: 'Overview',
    groups: [
      {
        id: 'overview-main',
        label: 'Overview',
        pages: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            href: '/admin/dashboard',
            permissionKeys: [],
          },
        ],
      },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    groups: [
      {
        id: 'crm-sales',
        label: 'CRM',
        pages: [
          {
            id: 'pipeline',
            label: 'Pipeline',
            href: '/admin/pipeline',
            permissionKeys: CRM_PIPELINE_PERMISSION_KEYS,
          },
          {
            id: 'leads',
            label: 'Leads',
            href: '/admin/leads',
            permissionKeys: CRM_LEADS_PERMISSION_KEYS,
          },
          {
            id: 'service-packages',
            label: 'Service Packages',
            href: '/admin/packages',
            permissionKeys: CRM_SERVICE_PACKAGES_PERMISSION_KEYS,
          },
          {
            id: 'proposals',
            label: 'Proposals & Quotations',
            href: '/admin/quotations',
            permissionKeys: CRM_QUOTATIONS_PERMISSION_KEYS,
          },
          {
            id: 'clients',
            label: 'Clients',
            href: '/admin/clients',
            permissionKeys: CRM_CLIENTS_PERMISSION_KEYS,
          },
        ],
      },
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    groups: [
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        pages: [
          {
            id: 'whatsapp-inbox',
            label: 'WhatsApp Inbox',
            href: '/admin/whatsapp/inbox',
            permissionKeys: [
              'whatsapp.read',
              'whatsapp.view_all',
              'whatsapp.reply',
              'whatsapp.assign',
            ],
          },
          {
            id: 'whatsapp-channels',
            label: 'WhatsApp Channels',
            href: '/admin/whatsapp/channels',
            permissionKeys: ['whatsapp.channels.manage'],
          },
          {
            id: 'whatsapp-templates',
            label: 'Templates',
            href: '/admin/whatsapp/templates',
            permissionKeys: ['whatsapp.templates.manage'],
          },
          {
            id: 'whatsapp-broadcasts',
            label: 'Broadcasts',
            href: '/admin/whatsapp/broadcasts',
            permissionKeys: ['whatsapp.broadcasts.manage'],
          },
          {
            id: 'whatsapp-reports',
            label: 'WhatsApp Reports',
            href: '/admin/whatsapp/reports',
            permissionKeys: ['whatsapp.view_all', 'whatsapp.channels.manage'],
          },
        ],
      },
    ],
  },
  {
    id: 'projects',
    label: 'Project Management',
    groups: [
      {
        id: 'project-workspace',
        label: 'Project Management',
        pages: [
          {
            id: 'daily-tasks',
            label: 'Daily Tasks',
            href: '/admin/daily-tasks',
            permissionKeys: PM_DAILY_TASKS_PERMISSION_KEYS,
          },
          {
            id: 'task-calendar',
            label: 'Task Calendar',
            href: '/admin/task-calendar',
            permissionKeys: PM_TASK_CALENDAR_PERMISSION_KEYS,
          },
          {
            id: 'projects',
            label: 'Projects',
            href: '/admin/project-tasks',
            permissionKeys: PROJECT_PERMISSION_KEYS,
          },
          {
            id: 'project-tasks',
            label: 'Project Tasks',
            href: '/admin/project-tasks',
            permissionKeys: TASK_PERMISSION_KEYS,
          },
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Expenses',
    groups: [
      {
        id: 'finance-main',
        label: 'Finance & Expenses',
        pages: [
          {
            id: 'finance-dashboard',
            label: 'Finance Dashboard',
            permissionKeys: ['finance.read', 'finance.manage'],
          },
          {
            id: 'expenses',
            label: 'Expenses',
            permissionKeys: [
              'expenses.read',
              'expenses.create',
              'expenses.update',
              'expenses.approve',
              'expenses.delete',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'hr',
    label: 'Human Resources',
    groups: [
      {
        id: 'hr-main',
        label: 'Human Resources',
        pages: [
          {
            id: 'employees',
            label: 'Employees',
            href: '/admin/employees',
            permissionKeys: [
              'employees.view',
              'employees.create',
              'employees.view_details',
              'employees.status',
              'employees.edit',
              'employees.delete',
            ],
          },
          {
            id: 'attendance-records',
            label: 'Attendance Records',
            href: '/admin/attendance',
            permissionKeys: [
              'attendance.records.view',
              'attendance.records.add',
              'attendance.records.view_details',
              'attendance.records.edit',
              'attendance.records.calendar_view',
              'attendance.view_summary',
              'attendance.records.manage_settings',
              'attendance.correct_records',
              'attendance.manage_devices',
              'attendance.view_audit',
            ],
          },
          {
            id: 'attendance-punch',
            label: 'Punch In / Punch Out',
            href: '/admin/attendance/punch',
            permissionKeys: [
              'attendance.punch.view',
              'attendance.punch.punch_in',
              'attendance.punch.punch_out',
              'attendance.punch.view_details',
              'attendance.punch.view_all',
            ],
          },
          {
            id: 'calendar',
            label: 'Organisation Calendar',
            href: '/admin/calendar',
            permissionKeys: [
              'organisation_calendar.view',
              'organisation_calendar.view_all',
              'organisation_calendar.create',
              'organisation_calendar.update',
              'organisation_calendar.delete',
              'organisation_calendar.manage_working_days',
              'organisation_calendar.manage_holidays',
              'organisation_calendar.export',
            ],
          },
          {
            id: 'leave-types',
            label: 'Leave Types',
            href: '/admin/leave-types',
            permissionKeys: [
              'leave.types.read',
              'leave.types.create',
              'leave.types.update',
              'leave.types.manage',
            ],
          },
          {
            id: 'leave-balances',
            label: 'Leave Balances',
            href: '/admin/leave-balances',
            permissionKeys: [
              'leave.config.read',
              'leave.config.manage',
              'leave.allocations.read',
              'leave.allocations.manage',
              'leave.balances.read',
              'leave.balances.adjust',
            ],
          },
          {
            id: 'employee-leave-records',
            label: 'Employee Leave Records',
            href: '/admin/employee-leave-records',
            permissionKeys: [
              'leave.balances.read',
              'leave.config.read',
              'leave.config.manage',
            ],
          },
          {
            id: 'leave-requests',
            label: 'Leave Management',
            href: '/admin/leave',
            permissionKeys: [
              'leave.requests.read_all',
              'leave.requests.read_own',
              'leave.requests.create',
              'leave.requests.approve',
              'leave.requests.reject',
              'leave.requests.cancel',
              'leave.balances.read',
              'leave.balances.read_own',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    groups: [
      {
        id: 'organization-access',
        label: 'Organization',
        pages: [
          {
            id: 'users',
            label: 'Users',
            href: '/admin/users',
            permissionKeys: [
              'users.read',
              'users.create',
              'users.update',
              'users.deactivate',
              'users.manage_roles',
              'users.reset_password',
              'memberships.invite',
              'memberships.manage',
            ],
          },
          {
            id: 'roles',
            label: 'Roles & Permissions',
            href: '/admin/roles',
            permissionKeys: [
              'roles.read',
              'roles.create',
              'roles.update',
              'roles.delete',
              'permissions.read',
            ],
          },
          {
            id: 'settings',
            label: 'Settings',
            permissionKeys: ['settings.read', 'settings.manage'],
          },
          {
            id: 'media',
            label: 'Media & files',
            permissionKeys: ['media.read', 'media.upload', 'media.delete'],
          },
        ],
      },
    ],
  },
] satisfies readonly PermissionHierarchyModule[];

const definitionByKey = new Map<PermissionKey, PermissionDefinition>(
  PERMISSION_DEFINITIONS.map((item) => [item.key, item]),
);

export function permissionDefinitionForKey(key: PermissionKey): PermissionDefinition {
  const found = definitionByKey.get(key);
  if (!found) {
    throw new Error(`Missing permission definition for key: ${key}`);
  }
  return found;
}

/** Unique permission keys referenced in the hierarchy (includes keys listed on multiple pages once). */
export function uniqueHierarchyPermissionKeys(
  hierarchy: readonly PermissionHierarchyModule[] = PERMISSION_HIERARCHY,
): readonly PermissionKey[] {
  const keys = new Set<PermissionKey>();
  for (const mod of hierarchy) {
    for (const group of mod.groups) {
      for (const page of group.pages) {
        for (const key of page.permissionKeys) {
          keys.add(key);
        }
      }
    }
  }
  return [...keys];
}

const PERMISSION_HIERARCHY_EXCLUDED_KEYS = new Set<PermissionKey>([
  ...LEGACY_LEADS_PERMISSION_KEYS,
  ...LEGACY_CLIENTS_PERMISSION_KEYS,
  ...LEGACY_ORG_CALENDAR_PERMISSION_KEYS,
  ...EMPLOYEES_HIERARCHY_EXCLUDED_KEYS,
  ...DAILY_TASKS_AUXILIARY_PERMISSION_KEYS,
]);

/** Ensures every catalog key appears on at least one hierarchy page. Keys may appear on multiple pages when backend shares them. */
export function assertPermissionHierarchyComplete(
  hierarchy: readonly PermissionHierarchyModule[] = PERMISSION_HIERARCHY,
): void {
  const seen = new Set<PermissionKey>();
  for (const mod of hierarchy) {
    for (const group of mod.groups) {
      for (const page of group.pages) {
        for (const key of page.permissionKeys) {
          seen.add(key);
        }
      }
    }
  }
  const missing = PERMISSION_KEYS.filter(
    (key) => !seen.has(key) && !PERMISSION_HIERARCHY_EXCLUDED_KEYS.has(key),
  );
  if (missing.length > 0) {
    throw new Error(`Permission hierarchy missing catalog keys: ${missing.join(', ')}`);
  }
}

export type FlattenedPermissionPage = PermissionHierarchyPage & {
  readonly moduleId: string;
  readonly moduleLabel: string;
  readonly groupId: string;
  readonly groupLabel: string;
};

export function flattenPermissionHierarchy(
  hierarchy: readonly PermissionHierarchyModule[] = PERMISSION_HIERARCHY,
): readonly FlattenedPermissionPage[] {
  const pages: FlattenedPermissionPage[] = [];
  for (const mod of hierarchy) {
    for (const group of mod.groups) {
      for (const page of group.pages) {
        if (page.permissionKeys.length === 0) continue;
        pages.push({
          ...page,
          moduleId: mod.id,
          moduleLabel: mod.label,
          groupId: group.id,
          groupLabel: group.label,
        });
      }
    }
  }
  return pages;
}
