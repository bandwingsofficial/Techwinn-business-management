import { Inject, Injectable } from '@nestjs/common';
import type {
  DashboardConfigurationPatch,
  DashboardDateRangePreset,
  DashboardMeResponse,
  DashboardSummaryResponse,
  DashboardWidgetData,
  DashboardWidgetDescriptor,
} from '#contracts';
import {
  DASHBOARD_OVERVIEW_SUMMARY,
  dashboardWidgetGridSpan,
  hasDashboardPermission,
} from '#contracts';
import type { OrgAccessActor } from '../../org-access/application/shared/org-access-actor.js';
import { DashboardAuthorizationService } from './services/dashboard-authorization.service.js';
import { DashboardDataService } from './services/dashboard-data.service.js';
import { DashboardDateRangeService } from './services/dashboard-date-range.service.js';
import { DashboardLayoutService } from './services/dashboard-layout.service.js';

function applyLayout(
  widgets: readonly DashboardWidgetDescriptor[],
  layout: { widgetOrder: readonly string[]; hiddenWidgets: readonly string[] },
): readonly DashboardWidgetDescriptor[] {
  const hidden = new Set(layout.hiddenWidgets);
  const visible = widgets.filter((w) => !hidden.has(w.key));
  if (layout.widgetOrder.length === 0) return visible;
  const orderIndex = new Map(layout.widgetOrder.map((key, index) => [key, index]));
  return [...visible].sort((a, b) => {
    const ai = orderIndex.get(a.key) ?? Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.get(b.key) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.key.localeCompare(b.key);
  });
}

@Injectable()
export class GetDashboardMeHandler {
  constructor(
    @Inject(DashboardAuthorizationService) private readonly authz: DashboardAuthorizationService,
    @Inject(DashboardLayoutService) private readonly layout: DashboardLayoutService,
    @Inject(DashboardDateRangeService) private readonly dateRange: DashboardDateRangeService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    preset: DashboardDateRangePreset = 'month',
    from?: string,
    to?: string,
  ): Promise<DashboardMeResponse> {
    const effective = await this.authz.assertDashboardAccess(actor);
    const layout = await this.layout.getLayout(actor);
    const allowed = await this.authz.accessibleDashboardWidgets(actor, effective);
    const permitted = allowed.map((widget) => {
      const scope = this.authz.scopeForWidget(actor, widget.key, effective) ?? undefined;
      return {
        key: widget.key,
        section: widget.section,
        title: widget.title,
        description: widget.description,
        kind: widget.kind,
        size: widget.size,
        gridColumnSpan: dashboardWidgetGridSpan(widget),
        ...(widget.chartHeight ? { chartHeight: widget.chartHeight } : {}),
        ...(scope ? { scope } : {}),
      } satisfies DashboardWidgetDescriptor;
    });
    const range = await this.dateRange.resolveForOrganization(
      actor.organizationId,
      preset,
      from,
      to,
    );
    return {
      widgets: applyLayout(permitted, layout),
      layout,
      dateRange: {
        preset,
        from: range.dateFrom.toISOString(),
        to: range.dateTo.toISOString(),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

@Injectable()
export class GetDashboardWidgetHandler {
  constructor(
    @Inject(DashboardAuthorizationService) private readonly authz: DashboardAuthorizationService,
    @Inject(DashboardDataService) private readonly data: DashboardDataService,
    @Inject(DashboardDateRangeService) private readonly dateRange: DashboardDateRangeService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    widgetKey: string,
    preset: DashboardDateRangePreset = 'month',
    from?: string,
    to?: string,
  ): Promise<DashboardWidgetData> {
    const effective = await this.authz.assertWidgetAccess(actor, widgetKey);
    const scope = this.authz.scopeForWidget(actor, widgetKey, effective);
    const range = await this.dateRange.resolveForOrganization(
      actor.organizationId,
      preset,
      from,
      to,
    );
    return this.data.loadWidget(actor, widgetKey, scope, range);
  }
}

@Injectable()
export class PatchDashboardConfigurationHandler {
  constructor(
    @Inject(DashboardAuthorizationService) private readonly authz: DashboardAuthorizationService,
    @Inject(DashboardLayoutService) private readonly layout: DashboardLayoutService,
  ) {}

  async execute(actor: OrgAccessActor, patch: DashboardConfigurationPatch) {
    const effective = await this.authz.assertDashboardAccess(actor);
    const permittedKeys = new Set(
      (await this.authz.accessibleDashboardWidgets(actor, effective)).map((w) => w.key),
    );
    const widgetOrder = patch.widgetOrder?.filter((key) => permittedKeys.has(key));
    const hiddenWidgets = patch.hiddenWidgets?.filter((key) => permittedKeys.has(key));
    return this.layout.patchLayout(actor, { widgetOrder, hiddenWidgets });
  }
}

@Injectable()
export class GetDashboardSummaryHandler {
  constructor(
    @Inject(GetDashboardWidgetHandler) private readonly widgets: GetDashboardWidgetHandler,
    @Inject(DashboardAuthorizationService) private readonly authz: DashboardAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor): Promise<DashboardSummaryResponse> {
    const effective = await this.authz.assertDashboardAccess(actor);
    if (!hasDashboardPermission(effective, DASHBOARD_OVERVIEW_SUMMARY)) {
      return { overview: [], generatedAt: new Date().toISOString() };
    }
    const overview = await this.widgets.execute(actor, 'overview.welcome', 'month');
    return {
      overview: overview.kpis ?? [],
      generatedAt: new Date().toISOString(),
    };
  }
}