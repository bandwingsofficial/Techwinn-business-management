import { Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '#contracts';
import { hasLeaveManagementPermission } from '#contracts';
import {
  PermissionCheckerService,
  type OrgAccessActor,
} from '../../../org-access/index.js';
import {
  LeaveEmployeeProfileNotLinkedError,
  LeaveForbiddenError,
} from '../../domain/errors/leave.errors.js';
import {
  LEAVE_REPOSITORY,
  type LeaveRepository,
} from '../../domain/repositories/leave.repository.js';

@Injectable()
export class LeaveAuthorizationService {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
    @Inject(LEAVE_REPOSITORY) private readonly leave: LeaveRepository,
  ) {}

  async resolveEffective(actor: OrgAccessActor): Promise<ReadonlySet<PermissionKey>> {
    const keys = await this.permissions.resolveEffectivePermissions(actor);
    return new Set(keys);
  }

  async requireAnyPermission(actor: OrgAccessActor, keys: readonly PermissionKey[]): Promise<void> {
    if (actor.isPlatformSuperAdmin) return;
    const effective = await this.resolveEffective(actor);
    if (keys.some((key) => effective.has(key))) return;
    throw new LeaveForbiddenError();
  }

  /**
   * Resolves the actor's own employee id for self-service leave endpoints.
   * Platform Super Admins use HR admin modules — they are not employee self-service actors.
   */
  async requireEmployeeId(actor: OrgAccessActor): Promise<string> {
    if (actor.isPlatformSuperAdmin) {
      throw new LeaveEmployeeProfileNotLinkedError(
        'Employee self-service leave is not available for platform Super Admin accounts. Use Leave Management under Human Resources instead.',
      );
    }
    const employeeId = await this.leave.resolveEmployeeId(actor.organizationId, actor.adminId);
    if (!employeeId) {
      throw new LeaveEmployeeProfileNotLinkedError();
    }
    return employeeId;
  }

  async hasPermission(actor: OrgAccessActor, key: PermissionKey): Promise<boolean> {
    if (actor.isPlatformSuperAdmin) return true;
    const effective = await this.resolveEffective(actor);
    return effective.has(key);
  }

  async hasLeaveManagementPermission(
    actor: OrgAccessActor,
    key: PermissionKey,
  ): Promise<boolean> {
    if (actor.isPlatformSuperAdmin) return true;
    const effective = await this.resolveEffective(actor);
    return hasLeaveManagementPermission(effective, key);
  }

  async requireLeaveManagementPermission(
    actor: OrgAccessActor,
    key: PermissionKey,
  ): Promise<void> {
    if (await this.hasLeaveManagementPermission(actor, key)) return;
    throw new LeaveForbiddenError();
  }
}
