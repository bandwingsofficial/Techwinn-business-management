'use client';

import type { DashboardKpiMetric } from '@techwin/contracts';
import { MoreHorizontal, TrendingDown, TrendingUp } from 'lucide-react';
import { useId } from 'react';
import {
  DASHBOARD_GRID_CARD_CLASS,
  DASHBOARD_MODULE_THEME,
  type DashboardModuleKey,
  dashboardModuleFromWidgetKey,
} from '../constants/dashboard-theme';
import { hasKpiTrend, describeKpiComparison } from '../utils/kpi-trend';
import { DashboardKpiSparkline } from './dashboard-kpi-sparkline';
import { cn } from '@/shared/lib/utils';

/**
 * Secondary module KPI strips (not the four hero cards). Capped at four metrics per row.
 * Sparklines and comparison text only appear when the API supplied real trend/comparison data.
 */
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
      {visible.map((metric, index) => {
        const comparison = describeKpiComparison(metric);
        return (
          <article
            key={metric.label}
            className={`${DASHBOARD_GRID_CARD_CLASS} relative flex h-[108px] min-w-0 items-center gap-3 overflow-hidden rounded-[10px] px-3.5 py-3`}
            style={{
              backgroundColor: theme.soft,
            }}
          >
            <MoreHorizontal
              className="absolute top-2.5 right-2.5 size-4 text-[#94A3B8] opacity-45"
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1 pr-6">
              <p className="text-xs font-semibold leading-tight text-balance text-[#243656]">
                {metric.label}
              </p>
              <p className="mt-0.5 text-[26px] font-bold leading-none tracking-tight text-[#172B50] tabular-nums">
                {typeof metric.value === 'number'
                  ? metric.value.toLocaleString()
                  : metric.value}
              </p>
              {comparison.deltaText ? (
                <p
                  className={cn(
                    'mt-1 flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
                    comparison.tone === 'up'
                      ? 'text-emerald-600'
                      : comparison.tone === 'down'
                        ? 'text-red-600'
                        : 'text-[#71819D]',
                  )}
                >
                  {comparison.tone === 'up' ? (
                    <TrendingUp className="size-3" aria-hidden="true" />
                  ) : comparison.tone === 'down' ? (
                    <TrendingDown className="size-3" aria-hidden="true" />
                  ) : null}
                  {comparison.deltaText}
                </p>
              ) : (
                <span className="mt-1 block h-[15px]" aria-hidden="true" />
              )}
              {comparison.label ? (
                <p className="mt-0.5 text-[10px] leading-none text-[#71819D]">
                  {comparison.label}
                </p>
              ) : metric.caption ? (
                <p className="mt-0.5 text-[10px] leading-none text-[#71819D]">
                  {metric.caption}
                </p>
              ) : null}
            </div>

            {hasKpiTrend(metric.trend) ? (
              <div className="hidden shrink-0 pr-1 sm:block">
                <DashboardKpiSparkline
                  color={theme.primary}
                  gradientId={`${sparklineScope}-${index}`}
                  trend={metric.trend}
                  className="h-[34px] w-[76px] shrink-0 overflow-visible sm:w-[88px]"
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function dashboardKpiModuleFromKey(
  widgetKey: string,
): DashboardModuleKey {
  return dashboardModuleFromWidgetKey(widgetKey);
}
