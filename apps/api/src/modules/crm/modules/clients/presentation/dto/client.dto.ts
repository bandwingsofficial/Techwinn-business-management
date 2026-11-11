export {
  createClientRequestSchema as createClientBodySchema,
  updateClientRequestSchema as updateClientBodySchema,
  changeClientStatusRequestSchema as changeClientStatusBodySchema,
} from '#validation';

export {
  crmClientResponseSchema,
  crmLeadConvertResponseSchema,
} from '../../../../shared/presentation/http/dto/crm.schemas.js';
