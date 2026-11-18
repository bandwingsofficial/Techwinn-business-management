import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export type CheckQuotationCodeAvailabilityQuery = {
  readonly actor: CrmActor;
  readonly code: string;
  readonly type: 'QUOTATION' | 'PROPOSAL';
  readonly excludeQuotationId?: string;
};