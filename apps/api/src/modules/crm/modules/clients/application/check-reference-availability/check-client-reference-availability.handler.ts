import { Injectable } from '@nestjs/common';
import {
  isValidClientReferenceNumber,
  type OrganizationCodeAvailabilityResponse,
} from '#validation';
import { OrganizationCodeAvailabilityService } from '../../../../../../lib/organization-code/organization-code-availability.service.js';
import { normalizeStoredOrganizationCode } from '../../../../../../lib/organization-code/organization-code-normalize.js';
import { ClientValidationError } from '../../domain/errors/client.errors.js';
import type { CheckClientReferenceAvailabilityQuery } from './check-client-reference-availability.query.js';

@Injectable()
export class CheckClientReferenceAvailabilityHandler {
  constructor(private readonly availability: OrganizationCodeAvailabilityService) {}

  async execute(
    query: CheckClientReferenceAvailabilityQuery,
  ): Promise<OrganizationCodeAvailabilityResponse> {
    const normalizedCode = normalizeStoredOrganizationCode(query.referenceNumber);
    if (!isValidClientReferenceNumber(normalizedCode)) {
      throw new ClientValidationError('Client reference number is invalid.', [
        { path: 'referenceNumber', message: 'Client reference number is invalid.' },
      ]);
    }
    const available = await this.availability.isClientReferenceAvailable(
      query.actor.organizationId,
      normalizedCode,
      query.excludeClientId,
    );
    return { available, normalizedCode };
  }
}