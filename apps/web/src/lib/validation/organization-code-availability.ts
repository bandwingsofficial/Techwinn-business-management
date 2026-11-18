import { z } from 'zod';

export const organizationCodeAvailabilityResponseSchema = z.object({
  available: z.boolean(),
  normalizedCode: z.string(),
});

export type OrganizationCodeAvailabilityResponse = z.infer<
  typeof organizationCodeAvailabilityResponseSchema
>;