import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { ProjectManagementModule } from '../project-management/index.js';
import {
  GetDashboardMeHandler,
  GetDashboardSummaryHandler,
  GetDashboardWidgetHandler,
  PatchDashboardConfigurationHandler,
} from './application/dashboard.handlers.js';
import { DashboardAuthorizationService } from './application/services/dashboard-authorization.service.js';
import { DashboardDataService } from './application/services/dashboard-data.service.js';
import { DashboardLayoutService } from './application/services/dashboard-layout.service.js';
import { DashboardController } from './presentation/http/controllers/dashboard.controller.js';

@Module({
  imports: [DatabaseModule, AuthModule, CrmModule, OrgAccessModule, ProjectManagementModule],
  controllers: [DashboardController],
  providers: [
    DashboardAuthorizationService,
    DashboardDataService,
    DashboardLayoutService,
    GetDashboardMeHandler,
    GetDashboardSummaryHandler,
    GetDashboardWidgetHandler,
    PatchDashboardConfigurationHandler,
  ],
  exports: [DashboardAuthorizationService],
})
export class DashboardModule {}