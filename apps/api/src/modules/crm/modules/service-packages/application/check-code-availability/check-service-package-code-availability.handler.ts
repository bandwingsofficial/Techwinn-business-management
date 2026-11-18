import { Injectable } from '@nestjs/common';
import {
  isValidServicePackageCode,
  type OrganizationCodeAvailabilityResponse,
} from '#validation';
import { OrganizationCodeAvailabilityService } from '../../../../../../lib/organization-code/organization-code-availability.service.js';
import { normalizeStoredOrganizationCode } from '../../../../../../lib/organization-code/organization-code-normalize.js';
import { ServicePackageValidationError } from '../../domain/errors/service-package.errors.js';
import type { CheckServicePackageCodeAvailabilityQuery } from './check-service-package-code-availability.query.js';

@Injectable()
export class CheckServicePackageCodeAvailabilityHandler {
  constructor(private readonly availability: OrganizationCodeAvailabilityService) {}

  async execute(
    query: CheckServicePackageCodeAvailabilityQuery,
  ): Promise<OrganizationCodeAvailabilityResponse> {
    const normalizedCode = normalizeStoredOrganizationCode(query.code);
    if (!isValidServicePackageCode(normalizedCode)) {
      throw new ServicePackageValidationError('Package code is invalid.', [
        { path: 'code', message: 'Package code is invalid.' },
      ]);
    }
    const available = await this.availability.isServicePackageCodeAvailable(
      query.actor.organizationId,
      normalizedCode,
      query.excludePackageId,
    );
    return { available, normalizedCode };
  }
}