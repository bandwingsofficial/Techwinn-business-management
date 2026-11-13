import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceSettingsResponse } from '#contracts';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceForbiddenError } from '../../domain/errors/attendance.errors.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class GetAttendanceSettingsHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor): Promise<AttendanceSettingsResponse> {
    const effective = await this.authz.resolveEffective(actor);
    const canRead =
      actor.isPlatformSuperAdmin ||
      effective.has('attendance.manage_settings') ||
      effective.has('calendar.view') ||
      effective.has('calendar.view_all') ||
      effective.has('attendance.view_own');
    if (!canRead) {
      throw new AttendanceForbiddenError();
    }
    return this.repository.getSettings(actor.organizationId);
  }
}
