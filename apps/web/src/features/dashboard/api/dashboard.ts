import { DASHBOARD_ROUTES, type DashboardConfigurationPatch, type DashboardDateRangePreset } from '@techwin/contracts';
import type { DashboardMeResponse, DashboardWidgetData, DashboardLayoutConfiguration } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';

export function getDashboardMe(
  preset: DashboardDateRangePreset = 'month',
  signal?: AbortSignal,
): Promise<DashboardMeResponse> {
  return apiRequest<DashboardMeResponse>(
    `${DASHBOARD_ROUTES.me}${buildQueryString({ preset })}`,
    { auth: true, signal },
  );
}

export function getDashboardWidget(
  widgetKey: string,
  preset: DashboardDateRangePreset = 'month',
  signal?: AbortSignal,
): Promise<DashboardWidgetData> {
  return apiRequest<DashboardWidgetData>(
    `${DASHBOARD_ROUTES.widget(widgetKey)}${buildQueryString({ preset })}`,
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