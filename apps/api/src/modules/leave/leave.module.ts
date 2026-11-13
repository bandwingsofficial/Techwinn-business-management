import { Module, forwardRef, type Provider } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { AttendanceModule } from '../attendance/attendance.module.js';
import { CrmModule } from '../crm/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { OrganizationCalendarModule } from '../organization-calendar/index.js';
import {
  ActivateLeaveYearConfigurationHandler,
  CloseLeaveYearConfigurationHandler,
  AdjustEmployeeLeaveBalanceHandler,
  ApplyForLeaveHandler,
  ApproveLeaveRequestHandler,
  CancelLeaveRequestHandler,
  CreateLeaveAllocationHandler,
  CreateLeaveBalanceConfigurationHandler,
  CreateLeaveYearConfigurationHandler,
  DeleteLeaveYearConfigurationHandler,
  GenerateEmployeeLeaveBalancesHandler,
  GetEmployeeLeaveBalanceHandler,
  GetLeaveRequestHandler,
  GetLeaveYearConfigurationHandler,
  GetMyLeaveRequestHandler,
  GetMyLeaveBalancesHandler,
  ListEmployeeLeaveBalancesHandler,
  ListEmployeeLeaveRecordsHandler,
  ListLeaveAllocationsHandler,
  ListLeaveBalanceTransactionsHandler,
  ListLeaveRequestsHandler,
  ListLeaveYearConfigurationsHandler,
  ListMyLeaveRequestsHandler,
  PreviewLeaveDaysHandler,
  RejectLeaveRequestHandler,
  SetLeaveYearConfigurationStatusHandler,
  UpdateLeaveAllocationHandler,
  UpdateLeaveBalanceConfigurationHandler,
  UpdateLeaveYearConfigurationHandler,
} from './application/leave.handlers.js';
import { LeaveAuthorizationService } from './application/services/leave-authorization.service.js';
import { LeaveDayCalculationService } from './application/services/leave-day-calculation.service.js';
import { ApprovedLeaveAvailabilityService } from './application/services/approved-leave-availability.service.js';
import { LeaveAttendanceSyncService } from './application/services/leave-attendance-sync.service.js';
import { ListApprovedLeaveAvailabilityHandler } from './application/list-approved-leave-availability/list-approved-leave-availability.handler.js';
import { LEAVE_REPOSITORY } from './domain/repositories/leave.repository.js';
import { PrismaLeaveRepository } from './infrastructure/persistence/prisma/repositories/prisma-leave.repository.js';
import {
  ChangeLeaveTypeStatusHandler,
  CreateLeaveTypeHandler,
  DeleteLeaveTypeHandler,
  GetLeaveTypeHandler,
  LEAVE_TYPE_REPOSITORY,
  LeaveTypesController,
  ListLeaveTypesHandler,
  PrismaLeaveTypeRepository,
  UpdateLeaveTypeHandler,
} from './modules/leave-types/index.js';
import { LeaveController } from './presentation/http/controllers/leave.controller.js';
import { LeaveExceptionFilter } from './presentation/http/filters/leave-exception.filter.js';

export const leavePersistenceProviders: Provider[] = [
  { provide: LEAVE_REPOSITORY, useClass: PrismaLeaveRepository },
  { provide: LEAVE_TYPE_REPOSITORY, useClass: PrismaLeaveTypeRepository },
];

const leaveHandlers = [
  LeaveAuthorizationService,
  LeaveDayCalculationService,
  ApprovedLeaveAvailabilityService,
  LeaveAttendanceSyncService,
  ListApprovedLeaveAvailabilityHandler,
  ListLeaveTypesHandler,
  GetLeaveTypeHandler,
  CreateLeaveTypeHandler,
  UpdateLeaveTypeHandler,
  ChangeLeaveTypeStatusHandler,
  DeleteLeaveTypeHandler,
  ListLeaveYearConfigurationsHandler,
  GetLeaveYearConfigurationHandler,
  CreateLeaveYearConfigurationHandler,
  CreateLeaveBalanceConfigurationHandler,
  UpdateLeaveBalanceConfigurationHandler,
  DeleteLeaveYearConfigurationHandler,
  UpdateLeaveYearConfigurationHandler,
  ActivateLeaveYearConfigurationHandler,
  CloseLeaveYearConfigurationHandler,
  SetLeaveYearConfigurationStatusHandler,
  GenerateEmployeeLeaveBalancesHandler,
  ListLeaveAllocationsHandler,
  CreateLeaveAllocationHandler,
  UpdateLeaveAllocationHandler,
  ListEmployeeLeaveBalancesHandler,
  ListEmployeeLeaveRecordsHandler,
  GetEmployeeLeaveBalanceHandler,
  AdjustEmployeeLeaveBalanceHandler,
  ListLeaveBalanceTransactionsHandler,
  ListLeaveRequestsHandler,
  GetLeaveRequestHandler,
  GetMyLeaveBalancesHandler,
  ListMyLeaveRequestsHandler,
  GetMyLeaveRequestHandler,
  PreviewLeaveDaysHandler,
  ApplyForLeaveHandler,
  CancelLeaveRequestHandler,
  ApproveLeaveRequestHandler,
  RejectLeaveRequestHandler,
] as const;

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CrmModule,
    OrgAccessModule,
    OrganizationCalendarModule,
    forwardRef(() => AttendanceModule),
  ],
  controllers: [LeaveTypesController, LeaveController],
  providers: [...leavePersistenceProviders, ...leaveHandlers, LeaveExceptionFilter],
  exports: [
    LEAVE_REPOSITORY,
    LEAVE_TYPE_REPOSITORY,
    LeaveExceptionFilter,
    ApprovedLeaveAvailabilityService,
  ],
})
export class LeaveModule {}
