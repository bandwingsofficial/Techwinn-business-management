import { Injectable } from '@nestjs/common';
import {
  type OrganizationCodeAvailabilityResponse,
} from '#validation';
import { isValidEmployeeCode } from '#validation';
import { OrganizationCodeAvailabilityService } from '../../../../lib/organization-code/organization-code-availability.service.js';
import { normalizeStoredOrganizationCode } from '../../../../lib/organization-code/organization-code-normalize.js';
import { EmployeeValidationError } from '../../domain/errors/employee.errors.js';
import type { CheckEmployeeCodeAvailabilityQuery } from './check-employee-code-availability.query.js';

@Injectable()
export class CheckEmployeeCodeAvailabilityHandler {
  constructor(private readonly availability: OrganizationCodeAvailabilityService) {}

  async execute(query: CheckEmployeeCodeAvailabilityQuery): Promise<OrganizationCodeAvailabilityResponse> {
    const normalizedCode = normalizeStoredOrganizationCode(query.code);
    if (!isValidEmployeeCode(normalizedCode)) {
      throw new EmployeeValidationError('Enter a valid employee code (TECH-EMP-0001).', [
        { path: 'employeeCode', message: 'Enter a valid employee code (TECH-EMP-0001).' },
      ]);
    }
    const available = await this.availability.isEmployeeCodeAvailable(
      query.actor.organizationId,
      normalizedCode,
      query.excludeEmployeeId,
    );
    return { available, normalizedCode };
  }
}