import type { Prisma } from '../../../../../../../generated/prisma/client.js';
import { bumpOrganizationSequenceFloor } from '../../../../../../../lib/persistence/organization-code-allocation.js';
import {
  maxClientReferenceSequence,
  nextClientReferencePreview,
} from '../../../../../../../lib/persistence/organization-code-sequence.js';
import { ClientNumberService } from '../../../domain/services/client-number.service.js';
import { CLIENT_SEQUENCE_KEY } from '../../../domain/types/client.types.js';

/** Allocates the next organization-scoped client reference inside an open transaction. */
export async function allocateClientReferenceNumber(
  tx: Pick<Prisma.TransactionClient, 'organizationSequence' | 'client'>,
  organizationId: string,
): Promise<string> {
  const maxAssigned = await maxClientReferenceSequence(tx, organizationId);
  const sequence = maxAssigned + 1;
  await bumpOrganizationSequenceFloor(tx, organizationId, CLIENT_SEQUENCE_KEY, sequence);
  return ClientNumberService.formatFromSequence(sequence);
}

/** Preview only — does not consume a sequence value. */
export function previewClientReferenceFromMaxAssigned(maxAssigned: number): string {
  return nextClientReferencePreview(maxAssigned);
}