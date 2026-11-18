import { z } from 'zod';

export const organizationCodeAvailabilityResponseSchema = z.object({
  available: z.boolean(),
  normalizedCode: z.string(),
});

export type OrganizationCodeAvailabilityResponse = z.infer<
  typeof organizationCodeAvailabilityResponseSchema
>;

const excludeIdSchema = z
  .string()
  .uuid()
  .optional();

function toQueryRecord(query: unknown): Record<string, unknown> {
  if (typeof query !== 'object' || query === null || Array.isArray(query)) {
    return {};
  }
  return query as Record<string, unknown>;
}

export function parseOrganizationCodeAvailabilityQuery(query: unknown) {
  const record = toQueryRecord(query);
  const code = typeof record.code === 'string' ? record.code : '';
  const excludeId =
    typeof record.excludeId === 'string' && record.excludeId.trim()
      ? record.excludeId.trim()
      : undefined;
  return organizationCodeAvailabilityQuerySchema.parse({ code, excludeId });
}

export const organizationCodeAvailabilityQuerySchema = z.object({
  code: z.string().trim().min(1, 'Code is required.'),
  excludeId: excludeIdSchema,
});

export function parseQuotationCodeAvailabilityQuery(query: unknown) {
  const record = toQueryRecord(query);
  const code = typeof record.code === 'string' ? record.code : '';
  const excludeId =
    typeof record.excludeId === 'string' && record.excludeId.trim()
      ? record.excludeId.trim()
      : undefined;
  const typeRaw = typeof record.type === 'string' ? record.type.trim().toUpperCase() : 'QUOTATION';
  const type = typeRaw === 'PROPOSAL' ? 'PROPOSAL' : 'QUOTATION';
  return quotationCodeAvailabilityQuerySchema.parse({ code, excludeId, type });
}

export const quotationCodeAvailabilityQuerySchema = z.object({
  code: z.string().trim().min(1, 'Code is required.'),
  excludeId: excludeIdSchema,
  type: z.enum(['QUOTATION', 'PROPOSAL']),
});