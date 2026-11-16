'use client';

import type { DashboardKpiMetric } from '@techwin/contracts';
import { MoreHorizontal, TrendingDown, TrendingUp } from 'lucide-react';
import { useId } from 'react';
import {
  DASHBOARD_MODULE_THEME,
  type DashboardModuleKey,
  dashboardModuleFromWidgetKey,
} from '../constants/dashboard-theme';
import { cn } from '@/shared/lib/utils';

const SPARKLINE_PATHS = [
  'M2 25 C12 20 15 11 25 16 S39 24 49 12 S63 20 73 10 S87 13 98 3',
  'M2 20 C12 25 17 12 27 15 S40 23 50 11 S64 16 74 8 S88 14 98 4',
];

function KpiSparkline({
  color,
  index,
  gradientId,
}: {
  color: string;
  index: number;
  gradientId: string;
}) {
  const path = SPARKLINE_PATHS[index % SPARKLINE_PATHS.length];

  return (
    <svg
      viewBox="0 0 100 34"
      className="h-[34px] w-[76px] shrink-0 overflow-visible sm:w-[88px]"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L98 34 L2 34 Z`} fill={`url(#${gradientId})`} />
      <path
        d={path}
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Secondary module KPI strips (not the four hero cards). Capped at four metrics per row. */
export function DashboardKpiStrip({
  kpis,
  module,
}: {
  kpis: readonly DashboardKpiMetric[];
  module: DashboardModuleKey;
}) {
  const sparklineScope = useId().replace(/:/g, '');
  const theme = DASHBOARD_MODULE_THEME[module];
  const visible = kpis.slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {visible.map((metric, index) => (
        <article
          key={metric.label}
          className="tw-dashboard-card-shadow relative flex h-[108px] min-w-0 items-center gap-3 overflow-hidden rounded-[10px] border px-3.5 py-3"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.soft,
          }}
        >
          <MoreHorizontal
            className="absolute top-2.5 right-2.5 size-4 text-[#94A3B8] opacity-45"
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1 pr-6">
            <p className="truncate text-xs font-semibold text-[#243656]">
              {metric.label}
            </p>
            <p className="mt-0.5 text-[26px] font-bold leading-none tracking-tight text-[#172B50] tabular-nums">
              {typeof metric.value === 'number'
                ? metric.value.toLocaleString()
                : metric.value}
            </p>
            {metric.deltaPercent != null ? (
              <p
                className={cn(
                  'mt-1 flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
                  metric.deltaPercent >= 0 ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {metric.deltaPercent >= 0 ? (
                  <TrendingUp className="size-3" aria-hidden="true" />
                ) : (
                  <TrendingDown className="size-3" aria-hidden="true" />
                )}
                {Math.abs(metric.deltaPercent)}%
              </p>
            ) : (
              <span className="mt-1 block h-[15px]" aria-hidden="true" />
            )}
            <p className="mt-0.5 text-[10px] leading-none text-[#71819D]">
              vs. last month
            </p>
          </div>

          <div className="hidden shrink-0 pr-1 sm:block">
            <KpiSparkline
              color={theme.primary}
              index={index}
              gradientId={`${sparklineScope}-${index}`}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

export function dashboardKpiModuleFromKey(
  widgetKey: string,
): DashboardModuleKey {
  return dashboardModuleFromWidgetKey(widgetKey);
}