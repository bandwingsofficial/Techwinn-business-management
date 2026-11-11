import { Inject, Injectable } from '@nestjs/common';
import { SYSTEM_ROLE_KEYS } from '#contracts';
import { OrgAccessValidationError } from '../../domain/errors/org-access.errors.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import { MemberAccountService } from '../services/member-account.service.js';
import type { ProvisionMemberCommand } from './provision-member.command.js';

@Injectable()
export class ProvisionMemberHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
    @Inject(MemberAccountService) private readonly memberAccounts: MemberAccountService,
  ) {}

  async execute(command: ProvisionMemberCommand) {
    const employeeRoleId = await this.repository.resolveSystemRoleId(
      command.organizationId,
      SYSTEM_ROLE_KEYS.employee,
    );
    const includesEmployeeRole = command.roleIds.includes(employeeRoleId);

    if (includesEmployeeRole && !command.employeeId) {
      throw new OrgAccessValidationError('Select an employee to link with this account.', [
        { path: 'employeeId', message: 'Select an employee.' },
      ]);
    }
    if (command.employeeId && !includesEmployeeRole) {
      throw new OrgAccessValidationError(
        'Employee linking is only allowed when the Employee role is assigned.',
        [{ path: 'employeeId', message: 'Remove the employee selection or assign the Employee role.' }],
      );
    }

    let email = command.email;
    let displayName = command.displayName;
    let phone = command.phone ?? null;

    if (command.employeeId) {
      const employee = await this.repository.findLinkableEmployeeProfile(
        command.organizationId,
        command.employeeId,
      );
      if (!employee) {
        throw new OrgAccessValidationError(
          'The selected employee is not eligible for account linking.',
          [
            {
              path: 'employeeId',
              message: 'Choose an employee without a linked sign-in account.',
            },
          ],
        );
      }
      // Trusted HR profile is the source of truth for linked employee accounts.
      email = employee.workEmail;
      displayName = employee.displayName;
      phone = employee.phone?.trim() ? employee.phone : null;
    }

    const account = await this.memberAccounts.prepareNewAccount({
      organizationId: command.organizationId,
      actorAdminId: command.actorAdminId,
      email,
      password: command.password,
      roleIds: command.roleIds,
    });
    return this.repository.provisionMember(
      command.organizationId,
      {
        displayName,
        phone,
        account,
        employeeId: command.employeeId,
      },
      command.actorAdminId,
    );
  }
}
