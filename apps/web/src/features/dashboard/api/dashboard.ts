import {
  DASHBOARD_ROUTES,
  type DashboardConfigurationPatch,
  type DashboardDateRangePreset,
} from '@techwin/contracts';
import type {
  DashboardMeResponse,
  DashboardWidgetData,
  DashboardLayoutConfiguration,
} from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';

export type DashboardQueryRange = {
  preset: DashboardDateRangePreset;
  from?: string;
  to?: string;
};

export function getDashboardMe(
  range: DashboardQueryRange = { preset: 'month' },
  signal?: AbortSignal,
): Promise<DashboardMeResponse> {
  return apiRequest<DashboardMeResponse>(
    `${DASHBOARD_ROUTES.me}${buildQueryString({
      preset: range.preset,
      ...(range.from ? { from: range.from } : {}),
      ...(range.to ? { to: range.to } : {}),
    })}`,
    { auth: true, signal },
  );
}

export function getDashboardWidget(
  widgetKey: string,
  range: DashboardQueryRange = { preset: 'month' },
  signal?: AbortSignal,
): Promise<DashboardWidgetData> {
  return apiRequest<DashboardWidgetData>(
    `${DASHBOARD_ROUTES.widget(widgetKey)}${buildQueryString({
      preset: range.preset,
      ...(range.from ? { from: range.from } : {}),
      ...(range.to ? { to: range.to } : {}),
    })}`,
    { auth: true, signal },
  );
}

export function patchDashboardConfiguration(
  body: DashboardConfigurationPatch,
): Promise<DashboardLayoutConfiguration> {
  return apiRequest<DashboardLayoutConfiguration>(DASHBOARD_ROUTES.configuration, {
    method: 'PATCH',
    auth: true,
    body,
  });
}