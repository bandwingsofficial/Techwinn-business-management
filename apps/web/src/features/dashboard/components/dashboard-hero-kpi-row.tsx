'use client';

import type {
  DashboardDateRangePreset,
  DashboardKpiMetric,
} from '@techwin/contracts';
import { MoreHorizontal, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { getDashboardWidget } from '../api/dashboard';
import { DASHBOARD_HERO_KPI_SLOTS } from '../constants/dashboard-theme';

const SPARKLINE_PATHS = [
  'M2 25 C12 20 15 11 25 16 S39 24 49 12 S63 20 73 10 S87 13 98 3',
  'M2 20 C12 25 17 12 27 15 S40 23 50 11 S64 16 74 8 S88 14 98 4',
  'M2 24 C13 19 16 10 27 15 S40 20 51 9 S65 17 75 8 S88 12 98 3',
  'M2 22 C13 15 17 19 27 12 S40 17 51 8 S64 16 76 7 S89 10 98 2',
] as const;

function pickPrimaryMetric(
  kpis: readonly DashboardKpiMetric[] | undefined,
): DashboardKpiMetric | null {
  if (!kpis?.length) return null;
  return (
    kpis.find((metric) => /total/i.test(metric.label)) ?? kpis[0] ?? null
  );
}

function HeroKpiSparkline({
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
      className="h-8 w-[70px] shrink-0"
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

type HeroSlotState = {
  metric: DashboardKpiMetric;
  slotIndex: number;
};

export function DashboardHeroKpiRow({
  enabledWidgetKeys,
  preset,
}: {
  enabledWidgetKeys: readonly string[];
  preset: DashboardDateRangePreset;
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
      slotsToLoad.map(async (slot) => {
        const index = DASHBOARD_HERO_KPI_SLOTS.findIndex(
          (entry) => entry.widgetKey === slot.widgetKey,
        );
        const payload = await getDashboardWidget(
          slot.widgetKey,
          preset,
          controller.signal,
        );
        const metric = pickPrimaryMetric(payload.kpis);
        if (!metric) return null;
        return { metric, slotIndex: index };
      }),
    )
      .then((results) => {
        if (controller.signal.aborted) return;
        setItems(
          results.filter((row): row is HeroSlotState => row !== null),
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [preset, slotsToLoad]);

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
        const deltaUp =
          metric.deltaPercent != null && metric.deltaPercent >= 0;

        return (
          <article
            key={slot.widgetKey}
            className="tw-dashboard-card-shadow relative grid h-[118px] min-w-0 grid-cols-[46px_minmax(0,1fr)] items-center gap-x-2.5 rounded-[10px] border px-3 py-3 sm:grid-cols-[46px_minmax(0,1fr)_70px]"
            style={{
              backgroundColor: slot.cardBg,
              borderColor: slot.border,
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
              <p className="mt-1 text-[26px] font-bold leading-none tracking-tight text-[#172B50] tabular-nums">
                {typeof metric.value === 'number'
                  ? metric.value.toLocaleString()
                  : metric.value}
              </p>
              <div className="mt-1.5 flex flex-col items-start gap-0.5">
                {metric.deltaPercent != null ? (
                  <p
                    className={`flex items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold tabular-nums ${
                      deltaUp ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {deltaUp ? (
                      <TrendingUp className="size-3 shrink-0" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="size-3 shrink-0" aria-hidden="true" />
                    )}
                    {deltaUp ? '+' : '-'}
                    {Math.abs(metric.deltaPercent)}%
                  </p>
                ) : null}
                <p className="whitespace-nowrap text-[10px] leading-none text-[#71819D]">
                  vs. last month
                </p>
              </div>
            </div>

            <div className="hidden justify-self-end sm:flex sm:items-center">
              <HeroKpiSparkline
                color={slot.accent}
                index={slotIndex}
                gradientId={gradientId}
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
          className="tw-dashboard-card-shadow h-[118px] animate-pulse rounded-[10px] border border-[#E0EDFF] bg-[#F1F6FF]"
        />
      ))}
    </div>
  );
}