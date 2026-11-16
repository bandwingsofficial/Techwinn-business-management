
'use client';

import type {
  DashboardChartHeight,
  DashboardDateRangePreset,
  DashboardGridSpan,
  DashboardWidgetData,
  DashboardWidgetDescriptor,
} from '@techwin/contracts';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getDashboardWidget } from '../api/dashboard';
import {
  DASHBOARD_CARD_SURFACE,
  DASHBOARD_MODULE_THEME,
  dashboardModuleFromWidgetKey,
} from '../constants/dashboard-theme';
import { chartHeightPx, dashboardWidgetColClass } from '../utils/dashboard-grid';

import { DashboardChartView } from './dashboard-chart-view';
import { DashboardEmptyState } from './dashboard-empty-state';
import {
  DashboardKpiStrip,
  dashboardKpiModuleFromKey,
} from './dashboard-kpi-strip';

import { cn } from '@/shared/lib/utils';

export function DashboardWidgetCard({
  widget,
  preset,
  className,
}: {
  widget: DashboardWidgetDescriptor;
  preset: DashboardDateRangePreset;
  className?: string;
}) {
  const [data, setData] = useState<DashboardWidgetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const span: DashboardGridSpan =
    widget.gridColumnSpan ?? (widget.size === 'full' ? 4 : 2);

  const chartHeight: DashboardChartHeight = widget.chartHeight ?? 'md';
  const chartPx = chartHeightPx(chartHeight);

  const module = dashboardModuleFromWidgetKey(widget.key);
  const theme = DASHBOARD_MODULE_THEME[module];

  useEffect(() => {
    if (widget.kind === 'section') return;

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    void getDashboardWidget(widget.key, preset, controller.signal)
      .then((payload) => {
        setData(payload);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : 'Failed to load widget',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [widget.key, widget.kind, preset]);

  if (widget.kind === 'section') {
    return null;
  }

  if (widget.kind === 'kpi') {
    return (
      <div
        className={cn(
          dashboardWidgetColClass(span),
          'flex min-w-0 flex-col',
          className,
        )}
      >
        {loading ? (
          <KpiSkeleton />
        ) : error ? (
          <WidgetError message={error} />
        ) : data?.kpis?.length ? (
          <DashboardKpiStrip
            kpis={data.kpis}
            module={dashboardKpiModuleFromKey(widget.key)}
          />
        ) : (
          <DashboardEmptyState title="No metrics in range" />
        )}
      </div>
    );
  }

  return (
    <article
      className={cn(
        dashboardWidgetColClass(span),
        'tw-dashboard-card-shadow flex h-full min-w-0 flex-col overflow-hidden rounded-xl border',
        className,
      )}
      style={{
        backgroundColor: DASHBOARD_CARD_SURFACE.background,
        borderColor: DASHBOARD_CARD_SURFACE.border,
      }}
    >
      {/* Widget header */}
      <header
        className="border-b px-4 py-3"
        style={{
          borderColor: theme.border,
          background: `linear-gradient(
            90deg,
            ${theme.soft} 0%,
            #FFFFFF 70%
          )`,
        }}
      >
        <WidgetHeading
          widget={widget}
          compact
          accentColor={theme.primary}
        />
      </header>

      {/* Widget content */}
      <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
        {loading ? (
          <ChartSkeleton height={chartPx} />
        ) : error ? (
          <WidgetError message={error} />
        ) : data?.empty ? (
          <DashboardEmptyState />
        ) : data?.chart &&
          (data.chart.series.length > 0 ||
            (data.chart.multiSeries?.some((group) => group.points.length > 0) ?? false)) ? (
          <div
            className="min-h-0 w-full"
            style={{ height: chartPx }}
          >
            <DashboardChartView
              chart={data.chart}
              height={chartHeight}
              widgetKey={widget.key}
            />
          </div>
        ) : data?.table ? (
          <CompactTable table={data.table} />
        ) : (
          <DashboardEmptyState />
        )}
      </div>
    </article>
  );
}

function WidgetHeading({
  widget,
  compact = false,
  accentColor,
}: {
  widget: DashboardWidgetDescriptor;
  compact?: boolean;
  accentColor: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span
        className="mt-1.5 size-2 shrink-0 rounded-full"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />

      <div className="min-w-0">
        <h3
          className={cn(
            'truncate font-semibold tracking-tight text-[#0F172A]',
            compact ? 'text-sm' : 'text-base',
          )}
        >
          {widget.title}
        </h3>

        {!compact && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
            {widget.description}
          </p>
        )}
      </div>
    </div>
  );
}

function WidgetError({ message }: { message: string }) {
  return (
    <p className="px-2 py-8 text-sm text-destructive">
      {message}
    </p>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="tw-dashboard-card-shadow h-[108px] animate-pulse rounded-[10px] border bg-white"
          style={{
            borderColor: DASHBOARD_CARD_SURFACE.border,
          }}
        />
      ))}
    </div>
  );
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-lg border bg-slate-50/70"
      style={{
        height,
        borderColor: DASHBOARD_CARD_SURFACE.border,
      }}
    />
  );
}

function CompactTable({
  table,
}: {
  table: NonNullable<DashboardWidgetData['table']>;
}) {
  return (
    <div
      className="max-h-[320px] overflow-auto rounded-lg border bg-white"
      style={{
        borderColor: DASHBOARD_CARD_SURFACE.border,
      }}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[#F5F7FF]">
          <tr className="text-left">
            {table.columns.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {table.rows.map((row, index) => (
            <tr
              key={index}
              className="border-t border-[#E9EDF7] transition-colors hover:bg-[#F8FAFF]"
            >
              {table.columns.map((col) => (
                <td
                  key={col.key}
                  className="whitespace-nowrap px-3 py-2.5 text-foreground"
                >
                  {row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
