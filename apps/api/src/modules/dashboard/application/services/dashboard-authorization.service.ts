import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  API_ERROR_CODES,
  canAccessDashboardPage,
  dashboardWidgetByKey,
  hasDashboardPermission,
  isShippedDashboardWidget,
  hasLeaveManagementPermission,
  LEAVE_MANAGEMENT_VIEW,
  canViewOrganizationProjectTasks,
  canViewOwnDailyTasks,
  type DashboardDataScopeKind,
  type PermissionKey,
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
    await this.assertModuleDataAccess(actor, effective, widgetKey);
    return effective;
  }

  private async assertModuleDataAccess(
    actor: OrgAccessActor,
    effective: ReadonlySet<PermissionKey>,
    widgetKey: string,
  ): Promise<void> {
    if (widgetKey.startsWith('tasks.')) {
      const scope = this.scopeForWidget(actor, widgetKey, effective);
      if (!scope) throw this.forbidden();
      if (scope === 'assigned' && !canViewOwnDailyTasks(effective)) throw this.forbidden();
      return;
    }
    if (widgetKey.startsWith('crm.')) {
      if (!effective.has('crm.leads.view') && !effective.has('leads.read')) {
        throw this.forbidden();
      }
      if (!resolveCrmDashboardScope(effective)) throw this.forbidden();
      return;
    }
    if (widgetKey.startsWith('projects.')) {
      if (!effective.has('projects.read')) throw this.forbidden();
      if (!resolveProjectDashboardScope(effective)) throw this.forbidden();
      return;
    }
    if (widgetKey.startsWith('employees.')) {
      if (!effective.has('employees.view') && !effective.has('employees.read')) {
        throw this.forbidden();
      }
      return;
    }
    if (widgetKey.startsWith('attendance.')) {
      if (
        !effective.has('attendance.records.view') &&
        !effective.has('attendance.punch.view') &&
        !effective.has('attendance.view_summary')
      ) {
        throw this.forbidden();
      }
      if (!resolveAttendanceDashboardScope(effective)) throw this.forbidden();
      return;
    }
    if (widgetKey.startsWith('leave.')) {
      const own =
        effective.has('leave.requests.read_own') ||
        effective.has('leave.balances.read_own');
      const admin = hasLeaveManagementPermission(effective, LEAVE_MANAGEMENT_VIEW);
      if (!own && !admin) throw this.forbidden();
      if (!resolveLeaveDashboardScope(effective)) throw this.forbidden();
      return;
    }
    if (widgetKey.startsWith('reports.')) {
      return;
    }
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