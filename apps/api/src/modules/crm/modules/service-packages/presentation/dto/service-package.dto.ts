/**
 * Service package HTTP request bodies — Zod schemas owned by #validation.
 * Response/OpenAPI helpers remain in crm/presentation/http/dto/crm.schemas.ts.
 */
export {
  changeServicePackageStatusRequestSchema as changeServicePackageStatusBodySchema,
  createServicePackageRequestSchema as createServicePackageBodySchema,
  updateServicePackageRequestSchema as updateServicePackageBodySchema,
} from '#validation';
