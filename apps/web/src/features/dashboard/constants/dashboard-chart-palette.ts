
export const DASHBOARD_CHART_COLORS = [
  '#2563EB', // Blue
  '#8B5CF6', // Lavender
  '#0D9488', // Teal
  '#16A34A', // Green
  '#EA580C', // Orange
  '#DC2626', // Red
  '#D97706', // Amber
  '#64748B', // Slate
] as const;

export const DASHBOARD_CHART_COLOR = (index: number): string => {
  const colorIndex =
    Math.abs(Math.trunc(index)) % DASHBOARD_CHART_COLORS.length;

  return DASHBOARD_CHART_COLORS[colorIndex] ?? DASHBOARD_CHART_COLORS[0];
};

export const TASK_STATUS_CHART_COLORS: Record<string, string> = {
  Completed: '#16A34A',
  'In Progress': '#2563EB',
  Pending: '#D97706',
  Overdue: '#DC2626',
  'Not Started': '#94A3B8',
};

export const TASK_TREND_LINE_COLORS: Record<string, string> = {
  Created: '#8B5CF6',
  Completed: '#2563EB',
};
