import type { DashboardGridSpan } from '@techwin/contracts';
import { cn } from '@/shared/lib/utils';

export function dashboardWidgetColClass(span: DashboardGridSpan = 2): string {
  switch (span) {
    case 1:
      return 'col-span-1';
    case 2:
      return 'col-span-1 sm:col-span-2 xl:col-span-2';
    case 3:
      return 'col-span-1 sm:col-span-2 xl:col-span-3';
    case 4:
    default:
      return 'col-span-1 sm:col-span-2 xl:col-span-4';
  }
}

export const DASHBOARD_GRID_CLASS = cn(
  'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
  'auto-rows-min items-start',
);

export function chartHeightPx(height?: 'sm' | 'md' | 'lg'): number {
  switch (height) {
    case 'sm':
      return 220;
    case 'lg':
      return 340;
    case 'md':
    default:
      return 280;
  }
}