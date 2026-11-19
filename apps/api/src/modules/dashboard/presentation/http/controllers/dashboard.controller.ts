import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DASHBOARD_VIEW,
  type DashboardConfigurationPatch,
  type DashboardDateRangePreset,
} from '#contracts';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../platform/tenant-context/index.js';
import { RequirePermissions } from '../../../../org-access/presentation/http/decorators/require-permissions.decorator.js';
import { RequirePermissionsGuard } from '../../../../org-access/presentation/http/guards/require-permissions.guard.js';
import { toOrgAccessActor } from '../../../../org-access/presentation/http/mappers/org-access-actor.mapper.js';
import {
  GetDashboardMeHandler,
  GetDashboardSummaryHandler,
  GetDashboardWidgetHandler,
  PatchDashboardConfigurationHandler,
} from '../../../application/dashboard.handlers.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
export class DashboardController {
  constructor(
    @Inject(GetDashboardMeHandler) private readonly getMe: GetDashboardMeHandler,
    @Inject(GetDashboardSummaryHandler) private readonly getSummary: GetDashboardSummaryHandler,
    @Inject(GetDashboardWidgetHandler) private readonly getWidget: GetDashboardWidgetHandler,
    @Inject(PatchDashboardConfigurationHandler)
    private readonly patchConfiguration: PatchDashboardConfigurationHandler,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Resolved dashboard widgets and layout for the signed-in member.' })
  @RequirePermissions(DASHBOARD_VIEW)
  me(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: { platformAuth?: { admin: { role: string } } },
    @Query('preset') preset?: DashboardDateRangePreset,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const actor = toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
    return this.getMe.execute(actor, preset ?? 'month', from, to);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard overview summary metrics.' })
  @RequirePermissions(DASHBOARD_VIEW)
  summary(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: { platformAuth?: { admin: { role: string } } },
  ) {
    const actor = toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
    return this.getSummary.execute(actor);
  }

  @Get('widgets/:widgetKey')
  @ApiOperation({ summary: 'Widget payload with authorization-scoped aggregates.' })
  @RequirePermissions(DASHBOARD_VIEW)
  widget(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: { platformAuth?: { admin: { role: string } } },
    @Param('widgetKey') widgetKey: string,
    @Query('preset') preset?: DashboardDateRangePreset,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const actor = toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
    return this.getWidget.execute(actor, widgetKey, preset ?? 'month', from, to);
  }

  @Get('available-widgets')
  @ApiOperation({ summary: 'Widget catalog resolved for the current member.' })
  @RequirePermissions(DASHBOARD_VIEW)
  available(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: { platformAuth?: { admin: { role: string } } },
    @Query('preset') preset?: DashboardDateRangePreset,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const actor = toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
    return this.getMe.execute(actor, preset ?? 'month', from, to);
  }

  @Patch('configuration')
  @ApiOperation({ summary: 'Persist personal dashboard layout within permitted widgets.' })
  @RequirePermissions(DASHBOARD_VIEW)
  configuration(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: { platformAuth?: { admin: { role: string } } },
    @Body() body: DashboardConfigurationPatch,
  ) {
    const actor = toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
    return this.patchConfiguration.execute(actor, body);
  }
}