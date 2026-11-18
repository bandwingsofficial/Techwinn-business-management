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

export function parseOrganizationCodeAvailabilityQuery(query: Record<string, unknown>) {
  const code = typeof query.code === 'string' ? query.code : '';
  const excludeId =
    typeof query.excludeId === 'string' && query.excludeId.trim()
      ? query.excludeId.trim()
      : undefined;
  return organizationCodeAvailabilityQuerySchema.parse({ code, excludeId });
}

export const organizationCodeAvailabilityQuerySchema = z.object({
  code: z.string().trim().min(1, 'Code is required.'),
  excludeId: excludeIdSchema,
});

export function parseQuotationCodeAvailabilityQuery(query: Record<string, unknown>) {
  const code = typeof query.code === 'string' ? query.code : '';
  const excludeId =
    typeof query.excludeId === 'string' && query.excludeId.trim()
      ? query.excludeId.trim()
      : undefined;
  const typeRaw = typeof query.type === 'string' ? query.type.trim().toUpperCase() : 'QUOTATION';
  const type = typeRaw === 'PROPOSAL' ? 'PROPOSAL' : 'QUOTATION';
  return quotationCodeAvailabilityQuerySchema.parse({ code, excludeId, type });
}

export const quotationCodeAvailabilityQuerySchema = z.object({
  code: z.string().trim().min(1, 'Code is required.'),
  excludeId: excludeIdSchema,
  type: z.enum(['QUOTATION', 'PROPOSAL']),
});