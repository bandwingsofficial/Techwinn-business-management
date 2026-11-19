'use client';

import type { DashboardKpiMetric } from '@techwin/contracts';
import { MoreHorizontal, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { getDashboardWidget, type DashboardQueryRange } from '../api/dashboard';
import {
  DASHBOARD_GRID_CARD_CLASS,
  DASHBOARD_HERO_KPI_SLOTS,
} from '../constants/dashboard-theme';
import { describeKpiComparison } from '../utils/kpi-trend';
import { DashboardKpiSparkline } from './dashboard-kpi-sparkline';

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
          // One failing card must not blank the others.
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

        return (
          <article
            key={slot.widgetKey}
            className={`${DASHBOARD_GRID_CARD_CLASS} relative grid h-[118px] min-w-0 grid-cols-[46px_minmax(0,1fr)] items-center gap-x-2.5 rounded-[10px] px-3 py-3 sm:grid-cols-[46px_minmax(0,1fr)_70px]`}
            style={{
              backgroundColor: slot.cardBg,
            }}
          >
            <MoreHorizontal
              className="absolute top-2.5 right-2.5 z-[1] size-4 text-[#94A3B8] opacity-45"
              aria-hidden="true"
            />

            <div
              className="flex size-[46px] shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: slot.iconBg, color: slot.accent }}
            >
              <Icon className="size-[22px]" strokeWidth={2.25} aria-hidden="true" />
            </div>

            <div className="min-w-0 justify-self-stretch overflow-visible pr-5">
              <p className="text-xs font-semibold leading-snug text-[#243656]">
                {slot.displayLabel}
              </p>
              {metric?.caption ? (
                <p className="mt-0.5 whitespace-nowrap text-[10px] leading-none text-[#71819D]">
                  {metric.caption}
                </p>
              ) : null}
              <p className="mt-1 text-[26px] font-bold leading-none tracking-tight text-[#172B50] tabular-nums">
                {metric
                  ? typeof metric.value === 'number'
                    ? metric.value.toLocaleString()
                    : metric.value
                  : '—'}
              </p>
              <div className="mt-1.5 flex flex-col items-start gap-0.5">
                {!metric ? (
                  <p className="whitespace-nowrap text-[10px] leading-none text-[#71819D]">
                    Couldn&apos;t load
                  </p>
                ) : metric.secondary ? (
                  <p className="whitespace-nowrap text-[11px] font-semibold tabular-nums text-[#243656]">
                    {metric.secondary.label}:{' '}
                    {typeof metric.secondary.value === 'number'
                      ? metric.secondary.value.toLocaleString()
                      : metric.secondary.value}
                  </p>
                ) : (
                  <>
                    {comparison?.deltaText ? (
                      <p
                        className={`flex items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold tabular-nums ${
                          comparison.tone === 'up'
                            ? 'text-emerald-600'
                            : comparison.tone === 'down'
                              ? 'text-red-600'
                              : 'text-[#71819D]'
                        }`}
                      >
                        {comparison.tone === 'up' ? (
                          <TrendingUp className="size-3 shrink-0" aria-hidden="true" />
                        ) : comparison.tone === 'down' ? (
                          <TrendingDown className="size-3 shrink-0" aria-hidden="true" />
                        ) : null}
                        {comparison.deltaText}
                      </p>
                    ) : null}
                    {comparison?.label ? (
                      <p className="whitespace-nowrap text-[10px] leading-none text-[#71819D]">
                        {comparison.label}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <div className="hidden justify-self-end sm:flex sm:items-center">
              <DashboardKpiSparkline
                color={slot.accent}
                gradientId={gradientId}
                trend={metric?.trend}
                title={TREND_TITLES[slot.widgetKey]}
                className="h-8 w-[70px] shrink-0"
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
          className={`${DASHBOARD_GRID_CARD_CLASS} h-[118px] animate-pulse rounded-[10px] bg-[#F1F6FF]`}
        />
      ))}
    </div>
  );
}
