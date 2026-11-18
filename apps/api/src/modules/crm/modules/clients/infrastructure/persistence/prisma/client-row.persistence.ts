import type { Prisma } from '../../../../../../../generated/prisma/client.js';
import type { CrmAuditInput } from '../../../../../shared/domain/repositories/crm.repository.js';
import { writeAudit } from '../../../../../shared/infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import type { ClientReadModel } from '../../../domain/types/client-read-model.js';
import type { ClientAuditEntry, CreateClientData } from '../../../domain/types/client.types.js';
import {
  formatClientReferenceNumber,
  isValidClientReferenceNumber,
  parseClientReferenceSequence,
} from '#validation';
import {
  ClientValidationError,
} from '../../../domain/errors/client.errors.js';
import { CLIENT_SEQUENCE_KEY } from '../../../domain/types/client.types.js';
import {
  isOrganizationCodeFormatError,
  throwOrganizationCodeDuplicateFromPrisma,
  resolveOrganizationCodeOnCreate,
} from '../../../../../../../lib/persistence/organization-code-allocation.js';
import { clientRowToReadModel } from './mappers/client.mapper.js';

export async function insertClientRowInTransaction(
  tx: Prisma.TransactionClient,
  organizationId: string,
  clientId: string,
  input: CreateClientData,
  audit: ClientAuditEntry | null,
): Promise<ClientReadModel> {
  let referenceNumber: string;
  try {
    referenceNumber = await resolveOrganizationCodeOnCreate(tx, {
      organizationId,
      sequenceKey: CLIENT_SEQUENCE_KEY,
      providedCode: input.referenceNumber,
      formatFromSequence: formatClientReferenceNumber,
      isValidFormat: isValidClientReferenceNumber,
      parseSequence: parseClientReferenceSequence,
      normalize: (value) => value.toUpperCase(),
      invalidFormatMessage: 'Client reference number is invalid.',
    });
  } catch (error) {
    if (isOrganizationCodeFormatError(error)) {
      throw new ClientValidationError(error.message, [
        { path: 'referenceNumber', message: error.message },
      ]);
    }
    throw error;
  }
  let client;
  try {
    client = await tx.client.create({
    data: {
      id: clientId,
      organizationId,
      referenceNumber,
      type: input.type,
      name: input.name,
      primaryContact: input.primaryContact ?? '',
      email: input.email ?? null,
      phone: input.phone,
      phoneNormalized: input.phoneNormalized,
      website: input.website ?? null,
      billingAddress: input.billingAddress ?? '',
      taxRegistration: input.taxRegistration ?? '',
      status: input.status ?? 'ACTIVE',
      notes: input.notes ?? '',
      sourceLeadId: input.sourceLeadId ?? null,
      createdByAdminId: input.createdByAdminId,
    },
    });
  } catch (error) {
    throwOrganizationCodeDuplicateFromPrisma(error, 'reference_number', 'referenceNumber');
    throw error;
  }
  if (audit) {
    await writeAudit(tx, organizationId, { ...(audit as CrmAuditInput), entityId: client.id });
  }
  return clientRowToReadModel(client);
}
