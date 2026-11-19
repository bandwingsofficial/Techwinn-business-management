'use client';

import type { DashboardKpiMetric } from '@techwin/contracts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { getDashboardWidget, type DashboardQueryRange } from '../api/dashboard';
import {
  DASHBOARD_GRID_CARD_CLASS,
  DASHBOARD_HERO_KPI_SLOTS,
} from '../constants/dashboard-theme';
import { describeKpiComparison } from '../utils/kpi-trend';
import { DashboardKpiSparkline } from './dashboard-kpi-sparkline';

/** Shared min height so all four hero cards align; content stays inside the card. */
const HERO_KPI_CARD_MIN_HEIGHT_CLASS = 'min-h-[126px]';

/** What each card's sparkline plots (one point per day of the selected period). */
const TREND_TITLES: Record<string, string> = {
  'tasks.kpi': 'Tasks assigned per day',
  'crm.kpi': 'Leads created per day',
  'projects.kpi': 'Projects created per day',
  'employees.kpi': 'Employees joined per day',
};

/** The API marks the metric a hero card should show; fall back to the first "Total ..." metric. */
function pickPrimaryMetric(
  kpis: readonly DashboardKpiMetric[] | undefined,
): DashboardKpiMetric | null {
  if (!kpis?.length) return null;
  return (
    kpis.find((metric) => metric.primary) ??
    kpis.find((metric) => /total/i.test(metric.label)) ??
    kpis[0] ??
    null
  );
}

type HeroSlotState = {
  /** Null when this card's request failed. */
  metric: DashboardKpiMetric | null;
  slotIndex: number;
};

export function DashboardHeroKpiRow({
  enabledWidgetKeys,
  range,
  refreshToken = 0,
}: {
  enabledWidgetKeys: readonly string[];
  range: DashboardQueryRange;
  /** Changing this value reloads every card for the same range (Refresh button). */
  refreshToken?: number;
}) {
  const sparklineScope = useId().replace(/:/g, '');
  const slotsToLoad = useMemo(
    () =>
      DASHBOARD_HERO_KPI_SLOTS.filter((slot) =>
        enabledWidgetKeys.includes(slot.widgetKey),
      ),
    [enabledWidgetKeys],
  );

  const [items, setItems] = useState<readonly HeroSlotState[]>([]);
  const [loading, setLoading] = useState(slotsToLoad.length > 0);

  useEffect(() => {
    if (slotsToLoad.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    void Promise.all(
      slotsToLoad.map(async (slot): Promise<HeroSlotState> => {
        const slotIndex = DASHBOARD_HERO_KPI_SLOTS.findIndex(
          (entry) => entry.widgetKey === slot.widgetKey,
        );
        try {
          const payload = await getDashboardWidget(
            slot.widgetKey,
            range,
            controller.signal,
          );
          return { metric: pickPrimaryMetric(payload.kpis), slotIndex };
        } catch {
          return { metric: null, slotIndex };
        }
      }),
    )
      .then((results) => {
        if (controller.signal.aborted) return;
        setItems(results);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [range, slotsToLoad, refreshToken]);

  if (slotsToLoad.length === 0) return null;

  if (loading) {
    return <DashboardHeroKpiRowSkeleton />;
  }

  if (items.length === 0) return null;

  const ordered = [...items].sort((a, b) => a.slotIndex - b.slotIndex);

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ordered.map(({ metric, slotIndex }) => {
        const slot = DASHBOARD_HERO_KPI_SLOTS[slotIndex];
        if (!slot) return null;
        const Icon = slot.icon;
        const gradientId = `${sparklineScope}-spark-${slotIndex}`;
        const comparison = metric ? describeKpiComparison(metric) : null;
        const comparisonTitle =
          comparison?.deltaText && comparison.label
            ? `${comparison.deltaText} ${comparison.label}`
            : comparison?.label ?? undefined;

        return (
          <article
            key={slot.widgetKey}
            className={`${DASHBOARD_GRID_CARD_CLASS} ${HERO_KPI_CARD_MIN_HEIGHT_CLASS} grid min-w-0 grid-cols-[42px_minmax(0,1fr)] items-center gap-x-2 overflow-hidden rounded-[10px] px-3 py-2.5 sm:grid-cols-[42px_minmax(0,1fr)_66px]`}
            style={{
              backgroundColor: slot.cardBg,
            }}
          >
            <div
              className="flex size-[42px] shrink-0 items-center justify-center self-center rounded-[10px]"
              style={{ backgroundColor: slot.iconBg, color: slot.accent }}
            >
              <Icon className="size-[20px]" strokeWidth={2.25} aria-hidden="true" />
            </div>

            <div className="min-w-0 justify-self-stretch overflow-hidden">
              <p className="truncate text-xs font-semibold leading-tight text-[#243656]">
                {slot.displayLabel}
              </p>
              {metric?.caption ? (
                <p className="mt-0.5 truncate text-[10px] leading-tight text-[#71819D]">
                  {metric.caption}
                </p>
              ) : null}
              <p className="mt-0.5 text-[24px] font-bold leading-none tracking-tight text-[#172B50] tabular-nums">
                {metric
                  ? typeof metric.value === 'number'
                    ? metric.value.toLocaleString()
                    : metric.value
                  : '—'}
              </p>
              <div className="mt-1 min-w-0">
                {!metric ? (
                  <p className="truncate text-[10px] leading-tight text-[#71819D]">
                    Couldn&apos;t load
                  </p>
                ) : metric.secondary ? (
                  <p
                    className="truncate text-[10px] font-semibold leading-tight tabular-nums text-[#243656]"
                    title={`${metric.secondary.label}: ${metric.secondary.value}`}
                  >
                    {metric.secondary.label}:{' '}
                    {typeof metric.secondary.value === 'number'
                      ? metric.secondary.value.toLocaleString()
                      : metric.secondary.value}
                  </p>
                ) : (
                  <div
                    className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0 leading-tight"
                    title={comparisonTitle}
                  >
                    {comparison?.deltaText ? (
                      <span
                        className={`inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold tabular-nums ${
                          comparison.tone === 'up'
                            ? 'text-emerald-600'
                            : comparison.tone === 'down'
                              ? 'text-red-600'
                              : 'text-[#71819D]'
                        }`}
                      >
                        {comparison.tone === 'up' ? (
                          <TrendingUp className="size-2.5 shrink-0" aria-hidden="true" />
                        ) : comparison.tone === 'down' ? (
                          <TrendingDown className="size-2.5 shrink-0" aria-hidden="true" />
                        ) : null}
                        {comparison.deltaText}
                      </span>
                    ) : null}
                    {comparison?.label ? (
                      <span className="min-w-0 truncate text-[10px] text-[#71819D]">
                        {comparison.label}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden min-w-0 justify-self-end overflow-hidden sm:flex sm:items-center">
              <DashboardKpiSparkline
                color={slot.accent}
                gradientId={gradientId}
                trend={metric?.trend}
                title={TREND_TITLES[slot.widgetKey]}
                className="h-8 w-[66px] shrink-0"
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function DashboardHeroKpiRowSkeleton() {
  return (
    <div
      className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading metrics"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className={`${DASHBOARD_GRID_CARD_CLASS} ${HERO_KPI_CARD_MIN_HEIGHT_CLASS} animate-pulse rounded-[10px] bg-[#F1F6FF]`}
        />
      ))}
    </div>
  );
}