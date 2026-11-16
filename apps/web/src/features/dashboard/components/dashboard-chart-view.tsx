'use client';

import type { DashboardChartHeight, DashboardChartPayload } from '@techwin/contracts';
import { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DASHBOARD_CHART_COLOR,
  TASK_STATUS_CHART_COLORS,
  TASK_TREND_LINE_COLORS,
} from '../constants/dashboard-chart-palette';
import { chartHeightPx } from '../utils/dashboard-grid';

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: '1px solid #E2E8F0',
  background: '#FFFFFF',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
  fontSize: 12,
  color: '#0F172A',
};

const AXIS_TICK = { fill: '#475569', fontSize: 11, fontWeight: 500 };

type ChartDatum = { label: string; value: number; fill?: string };

function seriesFill(label: string, index: number, widgetKey?: string): string {
  if (widgetKey === 'tasks.status_chart') {
    return TASK_STATUS_CHART_COLORS[label] ?? DASHBOARD_CHART_COLOR(index);
  }
  return DASHBOARD_CHART_COLOR(index);
}

function lineStroke(name: string, index: number, widgetKey?: string): string {
  if (widgetKey === 'tasks.trend_chart') {
    return TASK_TREND_LINE_COLORS[name] ?? DASHBOARD_CHART_COLOR(index);
  }
  return DASHBOARD_CHART_COLOR(index);
}

function toSeriesData(
  series: DashboardChartPayload['series'],
  widgetKey?: string,
): ChartDatum[] {
  return series.map((point, index) => ({
    label: point.label,
    value: point.value,
    fill: seriesFill(point.label, index, widgetKey),
  }));
}

function toMultiLineData(
  multiSeries: NonNullable<DashboardChartPayload['multiSeries']>,
): Record<string, string | number>[] {
  const labels = new Set<string>();
  for (const group of multiSeries) {
    for (const point of group.points) labels.add(point.label);
  }
  return [...labels].map((label) => {
    const row: Record<string, string | number> = { label };
    for (const group of multiSeries) {
      const match = group.points.find((p) => p.label === label);
      row[group.name] = match?.value ?? 0;
    }
    return row;
  });
}

function DonutCenterLabel({ total, cx, cy }: { total: number; cx: number; cy: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.4em" fill="#0F172A" fontSize={26} fontWeight={600}>
        {total.toLocaleString()}
      </tspan>
      <tspan x={cx} dy="1.5em" fill="#64748B" fontSize={12} fontWeight={500}>
        Tasks
      </tspan>
    </text>
  );
}

function formatDonutLegendEntry(
  label: string,
  value: number,
  total: number,
): string {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return `${label}  ${value.toLocaleString()} (${pct}%)`;
}

export function DashboardChartView({
  chart,
  height,
  widgetKey,
}: {
  chart: DashboardChartPayload;
  height?: DashboardChartHeight;
  widgetKey?: string;
}) {
  const areaGradientId = useId();
  const px = chartHeightPx(height);
  const data = toSeriesData(chart.series, widgetKey);
  const multi = chart.multiSeries?.length ? toMultiLineData(chart.multiSeries) : null;
  const isTaskStatusDonut =
    widgetKey === 'tasks.status_chart' && chart.chartType === 'donut';
  const donutTotal =
    chart.totalValue ??
    (isTaskStatusDonut ? data.reduce((sum, point) => sum + point.value, 0) : 0);
  const pieData = isTaskStatusDonut ? data.filter((point) => point.value > 0) : data;
  const pieSlices = pieData.length > 0 ? pieData : data;

  if (chart.chartType === 'donut' || chart.chartType === 'pie' || chart.chartType === 'funnel') {
    return (
      <ResponsiveContainer width="100%" height={px}>
        <PieChart>
          <Pie
            data={pieSlices}
            dataKey="value"
            nameKey="label"
            innerRadius={chart.chartType === 'donut' ? 58 : 0}
            outerRadius={96}
            paddingAngle={2}
            labelLine={false}
          >
            {pieSlices.map((entry) => (
              <Cell key={entry.label} fill={entry.fill ?? DASHBOARD_CHART_COLOR(0)} />
            ))}
            {chart.chartType === 'donut' && (chart.totalValue != null || isTaskStatusDonut) ? (
              <Label
                position="center"
                content={({ viewBox }) => {
                  if (
                    !viewBox ||
                    !('cx' in viewBox) ||
                    viewBox.cx == null ||
                    viewBox.cy == null
                  ) {
                    return null;
                  }
                  return (
                    <DonutCenterLabel
                      total={donutTotal}
                      cx={Number(viewBox.cx)}
                      cy={Number(viewBox.cy)}
                    />
                  );
                }}
              />
            ) : null}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => Number(value ?? 0).toLocaleString()}
          />
          {isTaskStatusDonut ? (
            <Legend
              content={() => (
                <ul className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-2">
                  {data.map((point) => (
                    <li
                      key={point.label}
                      className="flex items-center gap-1.5 text-xs text-slate-700"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: point.fill }}
                        aria-hidden
                      />
                      <span>{formatDonutLegendEntry(point.label, point.value, donutTotal)}</span>
                    </li>
                  ))}
                </ul>
              )}
            />
          ) : (
            <Legend wrapperStyle={{ fontSize: 12, color: '#334155' }} />
          )}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chart.chartType === 'horizontal_bar') {
    return (
      <ResponsiveContainer width="100%" height={px}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis type="number" tick={AXIS_TICK} />
          <YAxis type="category" dataKey="label" width={124} tick={AXIS_TICK} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => Number(value ?? 0).toLocaleString()}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={entry.fill ?? DASHBOARD_CHART_COLOR(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chart.chartType === 'line' && multi) {
    return (
      <ResponsiveContainer width="100%" height={px}>
        <LineChart data={multi} margin={{ left: 4, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="label" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#334155' }} />
          {chart.multiSeries!.map((group, index) => (
            <Line
              key={group.name}
              type="monotone"
              dataKey={group.name}
              stroke={lineStroke(group.name, index, widgetKey)}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chart.chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={px}>
        <AreaChart data={data} margin={{ left: 4, right: 12 }}>
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="label" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#2563EB"
            fill={`url(#${areaGradientId})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={px}>
      <BarChart data={data} margin={{ left: 4, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="label" tick={{ fill: '#334155', fontSize: 11 }} />
        <YAxis tick={{ fill: '#334155', fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={(value) => Number(value ?? 0).toLocaleString()} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={entry.fill ?? DASHBOARD_CHART_COLOR(index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}