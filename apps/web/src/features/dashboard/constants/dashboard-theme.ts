import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Layers, Users } from 'lucide-react';

export type DashboardModuleKey =
  | 'tasks'
  | 'crm'
  | 'projects'
  | 'employees'
  | 'attendance'
  | 'leave'
  | 'reports';

/** Dashboard page background (solid white). */
export const DASHBOARD_PAGE_BACKGROUND = '#FFFFFF';

/** Shared white card surface on the dashboard background. */
export const DASHBOARD_CARD_SURFACE = {
  background: '#FFFFFF',
  border: '#D4DEF7',
  /** Matches `.admin-app-header` (`var(--shadow-chrome-header)` in globals.css). */
  shadow: 'var(--shadow-chrome-header)',
} as const;

/**
 * Single class for every dashboard grid card: 1px border + admin header shadow.
 * Defined in `dashboard-page-background.css`.
 */
export const DASHBOARD_GRID_CARD_CLASS = 'tw-dashboard-grid-card';

export const DASHBOARD_MODULE_THEME: Record<
  DashboardModuleKey,
  { primary: string; soft: string; border: string }
> = {
  tasks: {
    primary: '#2563EB',
    soft: '#EFF6FF',
    border: '#BFDBFE',
  },
  crm: {
    primary: '#8B5CF6',
    soft: '#F5F3FF',
    border: '#DDD6FE',
  },
  projects: {
    primary: '#0D9488',
    soft: '#F0FDFA',
    border: '#99F6E4',
  },
  employees: {
    primary: '#EA580C',
    soft: '#FFF7ED',
    border: '#FED7AA',
  },
  attendance: {
    primary: '#16A34A',
    soft: '#F0FDF4',
    border: '#BBF7D0',
  },
  leave: {
    primary: '#E11D48',
    soft: '#FFF1F2',
    border: '#FECDD3',
  },
  reports: {
    primary: '#64748B',
    soft: '#F8FAFC',
    border: '#E2E8F0',
  },
};

/** Fixed pastel palettes for the four dashboard hero KPI cards (order matters). */
export const DASHBOARD_HERO_KPI_SLOTS = [
  {
    widgetKey: 'tasks.kpi',
    displayLabel: 'Total Tasks',
    icon: CheckCircle2,
    cardBg: '#F1F6FF',
    iconBg: '#DCEBFF',
    accent: '#2385FF',
    border: '#E0EDFF',
  },
  {
    widgetKey: 'crm.kpi',
    displayLabel: 'Total Leads',
    icon: Users,
    cardBg: '#F7F1FF',
    iconBg: '#EDE0FF',
    accent: '#A855F7',
    border: '#EDE4FF',
  },
  {
    widgetKey: 'projects.kpi',
    displayLabel: 'Total Projects',
    icon: Layers,
    cardBg: '#F0FCFC',
    iconBg: '#D4F7F4',
    accent: '#06B6B0',
    border: '#D8F3F1',
  },
  {
    widgetKey: 'employees.kpi',
    displayLabel: 'Total Employees',
    icon: Users,
    cardBg: '#FFF8F2',
    iconBg: '#FFE8D5',
    accent: '#FF8500',
    border: '#FFE8D8',
  },
] as const satisfies ReadonlyArray<{
  widgetKey: string;
  displayLabel: string;
  icon: LucideIcon;
  cardBg: string;
  iconBg: string;
  accent: string;
  border: string;
}>;

export const DASHBOARD_HERO_KPI_WIDGET_KEYS = DASHBOARD_HERO_KPI_SLOTS.map(
  (slot) => slot.widgetKey,
);

export function dashboardModuleFromWidgetKey(
  widgetKey: string,
): DashboardModuleKey {
  if (widgetKey.startsWith('tasks.')) return 'tasks';
  if (widgetKey.startsWith('crm.')) return 'crm';
  if (widgetKey.startsWith('projects.')) return 'projects';
  if (widgetKey.startsWith('employees.')) return 'employees';
  if (widgetKey.startsWith('attendance.')) return 'attendance';
  if (widgetKey.startsWith('leave.')) return 'leave';

  return 'reports';
}
