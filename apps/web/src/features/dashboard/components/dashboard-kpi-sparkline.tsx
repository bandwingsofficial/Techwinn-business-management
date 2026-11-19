import { buildSparklinePath } from '../utils/kpi-trend';

/**
 * KPI sparkline drawn from real per-day values of the selected period.
 * Keeps the original look (100x34 viewBox, soft gradient fill, 1.75 stroke). When there is no
 * trend data it renders a faint dashed baseline instead of a made-up curve.
 */
export function DashboardKpiSparkline({
  color,
  gradientId,
  trend,
  className,
  title,
}: {
  color: string;
  gradientId: string;
  trend: readonly number[] | undefined;
  className?: string;
  /** Accessible description of what the trend shows, e.g. "Tasks assigned per day". */
  title?: string;
}) {
  const path = buildSparklinePath(trend);

  if (!path) {
    return (
      <svg
        viewBox="0 0 100 34"
        className={className}
        fill="none"
        role="img"
        aria-label="No trend data for this period"
        data-empty="true"
      >
        <title>No trend data for this period</title>
        <path
          d="M2 25 L98 25"
          stroke={color}
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="2 4"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 100 34"
      className={className}
      fill="none"
      role="img"
      aria-label={title ?? 'Trend for the selected period'}
    >
      {title ? <title>{title}</title> : null}
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
