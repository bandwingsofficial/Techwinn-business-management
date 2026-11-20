import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  API_ERROR_CODES,
  canAccessDashboardPage,
  canAccessDashboardWidgetModuleData,
  dashboardWidgetByKey,
  hasDashboardPermission,
  isShippedDashboardWidget,
  canViewOrganizationProjectTasks,
  type DashboardDataScopeKind,
  type DashboardWidgetDefinition,
  type PermissionKey,
  permittedDashboardWidgets,
} from '#contracts';
import { ApiException } from '../../../../common/filters/api-error.response.js';
import type { OrgAccessActor } from '../../../org-access/application/shared/org-access-actor.js';
import { PermissionCheckerService } from '../../../org-access/application/services/permission-checker.service.js';
import { DailyTaskAuthorizationService } from '../../../project-management/modules/daily-tasks/application/services/daily-task-authorization.service.js';
import {
  resolveAttendanceDashboardScope,
  resolveCrmDashboardScope,
  resolveLeaveDashboardScope,
  resolveProjectDashboardScope,
  resolveTaskDashboardScope,
} from '#contracts';

@Injectable()
export class DashboardAuthorizationService {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
    @Inject(DailyTaskAuthorizationService) private readonly dailyTaskAuthz: DailyTaskAuthorizationService,
  ) {}

  async resolveEffective(actor: OrgAccessActor): Promise<ReadonlySet<PermissionKey>> {
    const keys = await this.permissions.resolveEffectivePermissions(actor);
    return new Set(keys);
  }

  async assertDashboardAccess(actor: OrgAccessActor): Promise<ReadonlySet<PermissionKey>> {
    const effective = await this.resolveEffective(actor);
    if (actor.isPlatformSuperAdmin || canAccessDashboardPage(effective)) {
      return effective;
    }
    throw new ApiException(
      HttpStatus.FORBIDDEN,
      API_ERROR_CODES.FORBIDDEN,
      'Dashboard access is not allowed.',
    );
  }

  async assertWidgetAccess(actor: OrgAccessActor, widgetKey: string): Promise<ReadonlySet<PermissionKey>> {
    const effective = await this.assertDashboardAccess(actor);
    if (!isShippedDashboardWidget(widgetKey)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        API_ERROR_CODES.FORBIDDEN,
        'This dashboard widget is not available.',
      );
    }
    const widget = dashboardWidgetByKey(widgetKey);
    if (!widget || !hasDashboardPermission(effective, widget.permissionKey)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        API_ERROR_CODES.FORBIDDEN,
        'This dashboard widget is not permitted.',
      );
    }
    if (!(await this.canAccessWidgetData(actor, widgetKey, effective))) {
      throw this.forbidden();
    }
    return effective;
  }

  async canAccessWidgetData(
    actor: OrgAccessActor,
    widgetKey: string,
    effective: ReadonlySet<PermissionKey>,
  ): Promise<boolean> {
    if (!isShippedDashboardWidget(widgetKey)) return false;
    const widget = dashboardWidgetByKey(widgetKey);
    if (!widget || !hasDashboardPermission(effective, widget.permissionKey)) return false;
    if (!canAccessDashboardWidgetModuleData(effective, widgetKey)) return false;
    if (widgetKey.startsWith('overview.') || widgetKey.startsWith('reports.')) {
      return true;
    }
    return this.scopeForWidget(actor, widgetKey, effective) !== null;
  }

  async accessibleDashboardWidgets(
    actor: OrgAccessActor,
    effective: ReadonlySet<PermissionKey>,
  ): Promise<readonly DashboardWidgetDefinition[]> {
    const accessible: DashboardWidgetDefinition[] = [];
    for (const widget of permittedDashboardWidgets(effective)) {
      if (await this.canAccessWidgetData(actor, widget.key, effective)) {
        accessible.push(widget);
      }
    }
    return accessible;
  }

  /**
   * Task and project widgets fall back to the caller's own assignments unless the account
   * passes the same organization task-visibility rules as the task modules themselves.
   */
  scopeForWidget(
    actor: OrgAccessActor,
    widgetKey: string,
    effective: ReadonlySet<PermissionKey>,
  ): DashboardDataScopeKind | null {
    if (widgetKey.startsWith('tasks.')) {
      const scope = resolveTaskDashboardScope(effective);
      if (!scope || scope === 'assigned') return scope;
      return this.dailyTaskAuthz.canViewOrganizationTasks(actor, effective) ? scope : 'assigned';
    }
    if (widgetKey.startsWith('crm.')) return resolveCrmDashboardScope(effective);
    if (widgetKey.startsWith('projects.')) {
      const scope = resolveProjectDashboardScope(effective);
      if (!scope || scope === 'assigned') return scope;
      return canViewOrganizationProjectTasks(effective, actor.isPlatformSuperAdmin)
        ? scope
        : 'assigned';
    }
    if (widgetKey.startsWith('employees.')) return 'organization';
    if (widgetKey.startsWith('attendance.')) return resolveAttendanceDashboardScope(effective);
    if (widgetKey.startsWith('leave.')) return resolveLeaveDashboardScope(effective);
    return null;
  }

  private forbidden(): ApiException {
    return new ApiException(
      HttpStatus.FORBIDDEN,
      API_ERROR_CODES.FORBIDDEN,
      'Insufficient module access for this dashboard widget.',
    );
  }
}