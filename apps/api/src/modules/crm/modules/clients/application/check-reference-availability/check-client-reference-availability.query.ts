import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export type CheckClientReferenceAvailabilityQuery = {
  readonly actor: CrmActor;
  readonly referenceNumber: string;
  readonly excludeClientId?: string;
};