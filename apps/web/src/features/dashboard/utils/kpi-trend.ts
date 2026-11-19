/**
 * Pure helpers for dashboard KPI cards. No imports on purpose so they can be unit-tested directly.
 *
 * The sparkline geometry matches the original card design: a 100x34 viewBox with the line kept
 * inside x 2..98 and y 3..25 so the gradient fill below it stays visible.
 */

const X_MIN = 2;
const X_MAX = 98;
const Y_TOP = 3;
const Y_BOTTOM = 25;

type Point = { readonly x: number; readonly y: number };

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** True when `trend` has real, drawable data: at least two points and at least one non-zero. */
export function hasKpiTrend(trend: readonly number[] | undefined | null): trend is readonly number[] {
  return (
    Array.isArray(trend) &&
    trend.length >= 2 &&
    trend.every((value) => Number.isFinite(value)) &&
    trend.some((value) => value !== 0)
  );
}

/**
 * SVG path (viewBox 0 0 100 34) for a smooth line through `trend`, or null when there is no
 * trend data to draw. Nothing is invented: a missing/flat-zero/single-point series yields null.
 */
export function buildSparklinePath(
  trend: readonly number[] | undefined | null,
): string | null {
  if (!hasKpiTrend(trend)) return null;

  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const span = max - min;
  const mid = (Y_TOP + Y_BOTTOM) / 2;

  const points: Point[] = trend.map((value, i) => ({
    x: X_MIN + ((X_MAX - X_MIN) * i) / (trend.length - 1),
    // Higher value -> smaller y. A perfectly flat (non-zero) series is drawn mid-height.
    y: span === 0 ? mid : Y_BOTTOM - ((value - min) / span) * (Y_BOTTOM - Y_TOP),
  }));

  const first = points[0] as Point;
  let d = `M${round(first.x)} ${round(first.y)}`;
  // Catmull-Rom -> cubic Bezier, with control points clamped so the curve never overshoots
  // outside the plot band.
  for (let i = 0; i < points.length - 1; i += 1) {
    const p1 = points[i] as Point;
    const p0 = points[i - 1] ?? p1;
    const p2 = points[i + 1] as Point;
    const p3 = points[i + 2] ?? p2;
    const clampY = (y: number) => Math.min(Y_BOTTOM, Math.max(Y_TOP, y));
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clampY(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clampY(p2.y - (p3.y - p1.y) / 6);
    d += ` C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2.x)} ${round(p2.y)}`;
  }
  return d;
}

export type KpiComparisonView = {
  /** e.g. "+12%" — null when there is no meaningful percentage. */
  readonly deltaText: string | null;
  readonly tone: 'up' | 'down' | 'flat' | null;
  /** e.g. "vs. last week", or "0 vs. last week" when the previous value was 0. Null if no comparison. */
  readonly label: string | null;
};

type ComparableMetric = {
  readonly previousValue?: number | string | null;
  readonly deltaPercent?: number | null;
  readonly comparisonLabel?: string | null;
};

/**
 * Describe a KPI's comparison against the previous period using only what the API returned.
 * Without a comparison label (e.g. All time) nothing is shown — no default "vs. last month".
 */
export function describeKpiComparison(metric: ComparableMetric): KpiComparisonView {
  const label = metric.comparisonLabel?.trim() || null;
  if (!label) return { deltaText: null, tone: null, label: null };

  if (typeof metric.deltaPercent === 'number' && Number.isFinite(metric.deltaPercent)) {
    const pct = metric.deltaPercent;
    const sign = pct > 0 ? '+' : pct < 0 ? '-' : '';
    return {
      deltaText: `${sign}${Math.abs(pct)}%`,
      tone: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
      label,
    };
  }

  // Previous period had nothing to divide by: show the raw previous value instead of a percent.
  const previous = metric.previousValue;
  return {
    deltaText: null,
    tone: null,
    label: previous === null || previous === undefined ? label : `${previous} ${label}`,
  };
}
