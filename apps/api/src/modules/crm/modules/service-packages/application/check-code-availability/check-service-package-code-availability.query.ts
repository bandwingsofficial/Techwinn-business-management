import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export type CheckServicePackageCodeAvailabilityQuery = {
  readonly actor: CrmActor;
  readonly code: string;
  readonly excludePackageId?: string;
};