import { Injectable } from '@nestjs/common';
import {
  isValidQuotationDocumentNumber,
  type OrganizationCodeAvailabilityResponse,
} from '#validation';
import { OrganizationCodeAvailabilityService } from '../../../../../../lib/organization-code/organization-code-availability.service.js';
import { normalizeStoredOrganizationCode } from '../../../../../../lib/organization-code/organization-code-normalize.js';
import { CrmValidationError } from '../../../../shared/domain/errors/crm.errors.js';
import type { CheckQuotationCodeAvailabilityQuery } from './check-quotation-code-availability.query.js';

@Injectable()
export class CheckQuotationCodeAvailabilityHandler {
  constructor(private readonly availability: OrganizationCodeAvailabilityService) {}

  async execute(
    query: CheckQuotationCodeAvailabilityQuery,
  ): Promise<OrganizationCodeAvailabilityResponse> {
    const normalizedCode = normalizeStoredOrganizationCode(query.code);
    if (!isValidQuotationDocumentNumber(normalizedCode, query.type)) {
      throw new CrmValidationError('Quotation number is invalid.', [
        { path: 'documentNumber', message: 'Quotation number is invalid.' },
      ]);
    }
    const available = await this.availability.isQuotationDocumentNumberAvailable(
      query.actor.organizationId,
      normalizedCode,
      query.excludeQuotationId,
    );
    return { available, normalizedCode };
  }
}