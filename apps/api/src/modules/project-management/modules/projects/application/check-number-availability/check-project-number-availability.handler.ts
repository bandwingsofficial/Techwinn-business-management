import { Injectable } from '@nestjs/common';
import { isValidProjectNumber, type OrganizationCodeAvailabilityResponse } from '#validation';
import { OrganizationCodeAvailabilityService } from '../../../../../../lib/organization-code/organization-code-availability.service.js';
import { normalizeStoredOrganizationCode } from '../../../../../../lib/organization-code/organization-code-normalize.js';
import { ProjectValidationError } from '../../domain/errors/project.errors.js';
import type { CheckProjectNumberAvailabilityQuery } from './check-project-number-availability.query.js';

@Injectable()
export class CheckProjectNumberAvailabilityHandler {
  constructor(private readonly availability: OrganizationCodeAvailabilityService) {}

  async execute(
    query: CheckProjectNumberAvailabilityQuery,
  ): Promise<OrganizationCodeAvailabilityResponse> {
    const normalizedCode = normalizeStoredOrganizationCode(query.projectNumber);
    if (!isValidProjectNumber(normalizedCode)) {
      throw new ProjectValidationError('Project number is invalid.');
    }
    const available = await this.availability.isProjectNumberAvailable(
      query.actor.organizationId,
      normalizedCode,
      query.excludeProjectId,
    );
    return { available, normalizedCode };
  }
}