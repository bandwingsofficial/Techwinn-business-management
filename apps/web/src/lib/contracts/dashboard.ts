import { API_PREFIX } from './http';

export const DASHBOARD_ROUTES = {
  me: `${API_PREFIX}/dashboard/me`,
  summary: `${API_PREFIX}/dashboard/summary`,
  widgets: `${API_PREFIX}/dashboard/widgets`,
  widget: (widgetKey: string) => `${API_PREFIX}/dashboard/widgets/${encodeURIComponent(widgetKey)}`,
  configuration: `${API_PREFIX}/dashboard/configuration`,
  availableWidgets: `${API_PREFIX}/dashboard/available-widgets`,
} as const;

export type DashboardDateRangePreset =
  | 'today'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | 'custom';

export type DashboardDataScopeKind = 'organization' | 'team' | 'assigned' | 'own';

export type DashboardWidgetKind = 'kpi' | 'chart' | 'table' | 'section';

export type DashboardGridSpan = 1 | 2 | 3 | 4;

export type DashboardChartHeight = 'sm' | 'md' | 'lg';

export type DashboardWidgetDescriptor = {
  readonly key: string;
  readonly section: string;
  readonly title: string;
  readonly description: string;
  readonly kind: DashboardWidgetKind;
  readonly scope?: DashboardDataScopeKind;
  readonly size: 'sm' | 'md' | 'lg' | 'full';
  readonly gridColumnSpan?: DashboardGridSpan;
  readonly chartHeight?: DashboardChartHeight;
};

export type DashboardLayoutConfiguration = {
  readonly widgetOrder: readonly string[];
  readonly hiddenWidgets: readonly string[];
  readonly updatedAt: string | null;
};

export type DashboardMeResponse = {
  readonly widgets: readonly DashboardWidgetDescriptor[];
  readonly layout: DashboardLayoutConfiguration;
  readonly dateRange: {
    readonly preset: DashboardDateRangePreset;
    readonly from: string;
    readonly to: string;
  };
  readonly generatedAt: string;
};

export type DashboardKpiMetric = {
  readonly label: string;
  readonly value: number | string;
  readonly previousValue?: number | string | null;
  readonly deltaPercent?: number | null;
};

export type DashboardChartSeriesPoint = {
  readonly label: string;
  readonly value: number;
};

export type DashboardChartPayload = {
  readonly chartType:
    | 'donut'
    | 'pie'
    | 'bar'
    | 'stacked_bar'
    | 'horizontal_bar'
    | 'line'
    | 'area'
    | 'funnel'
    | 'progress';
  readonly series: readonly DashboardChartSeriesPoint[];
  readonly multiSeries?: readonly {
    readonly name: string;
    readonly points: readonly DashboardChartSeriesPoint[];
  }[];
  /** When set (e.g. task status donut), shown as the centre total; may differ from sum of slices. */
  readonly totalValue?: number;
};

export type DashboardTableColumn = {
  readonly key: string;
  readonly label: string;
};

export type DashboardTableRow = Readonly<Record<string, string | number | null>>;

export type DashboardWidgetData = {
  readonly widgetKey: string;
  readonly scope: DashboardDataScopeKind | null;
  readonly kpis?: readonly DashboardKpiMetric[];
  readonly chart?: DashboardChartPayload | null;
  readonly table?: {
    readonly columns: readonly DashboardTableColumn[];
    readonly rows: readonly DashboardTableRow[];
  } | null;
  readonly empty: boolean;
  readonly generatedAt: string;
};

export type DashboardSummaryResponse = {
  readonly overview: readonly DashboardKpiMetric[];
  readonly generatedAt: string;
};

export type DashboardConfigurationPatch = {
  readonly widgetOrder?: readonly string[];
  readonly hiddenWidgets?: readonly string[];
};

export type DashboardConfigurationResponse = DashboardLayoutConfiguration;