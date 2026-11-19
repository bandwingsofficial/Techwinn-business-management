import type { DashboardKpiMetric } from '#contracts';

/** Sparklines never need more points than this; longer ranges are summed into buckets. */
export const DASHBOARD_KPI_TREND_MAX_POINTS = 30;

/**
 * Percent change versus the previous period, rounded to a whole number.
 * Null when there is nothing meaningful to divide by (previous is 0) — never invented.
 */
export function computeDeltaPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Sum consecutive daily counts into at most `maxPoints` buckets (oldest first).
 * Totals are preserved: the sum of the result equals the sum of the input.
 */
export function bucketTrend(
  daily: readonly number[],
  maxPoints: number = DASHBOARD_KPI_TREND_MAX_POINTS,
): number[] {
  if (daily.length <= maxPoints) return [...daily];
  const buckets: number[] = [];
  const size = daily.length / maxPoints;
  for (let i = 0; i < maxPoints; i += 1) {
    const from = Math.round(i * size);
    const to = Math.round((i + 1) * size);
    let sum = 0;
    for (let j = from; j < to; j += 1) sum += daily[j] ?? 0;
    buckets.push(sum);
  }
  return buckets;
}

export type PeriodComparison = {
  readonly previousValue: number;
  readonly comparisonLabel: string;
};

/**
 * Build a hero KPI metric. `trend` is only attached when the caller supplied real daily counts;
 * `comparison` is only attached when a previous period exists.
 */
export function buildPeriodKpiMetric(input: {
  readonly label: string;
  readonly value: number;
  readonly caption: string;
  readonly comparison: PeriodComparison | null;
  readonly dailyTrend?: readonly number[];
  readonly secondary?: DashboardKpiMetric['secondary'];
  readonly primary?: boolean;
}): DashboardKpiMetric {
  const base: DashboardKpiMetric = {
    label: input.label,
    value: input.value,
    caption: input.caption,
    ...(input.primary ? { primary: true } : {}),
    ...(input.secondary ? { secondary: input.secondary } : {}),
    ...(input.dailyTrend ? { trend: bucketTrend(input.dailyTrend) } : {}),
  };
  if (!input.comparison) {
    return { ...base, previousValue: null, deltaPercent: null, comparisonLabel: null };
  }
  return {
    ...base,
    previousValue: input.comparison.previousValue,
    deltaPercent: computeDeltaPercent(input.value, input.comparison.previousValue),
    comparisonLabel: input.comparison.comparisonLabel,
  };
}
