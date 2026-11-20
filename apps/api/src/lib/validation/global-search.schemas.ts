import { z } from 'zod';
import {
  GLOBAL_SEARCH_CATEGORIES,
  GLOBAL_SEARCH_DEFAULT_LIMIT,
  GLOBAL_SEARCH_MAX_LIMIT,
  GLOBAL_SEARCH_MIN_QUERY_LENGTH,
} from '#contracts';

export const globalSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(GLOBAL_SEARCH_MIN_QUERY_LENGTH, `Search at least ${GLOBAL_SEARCH_MIN_QUERY_LENGTH} characters.`)
    .max(120),
  limit: z.coerce.number().int().min(1).max(GLOBAL_SEARCH_MAX_LIMIT).default(GLOBAL_SEARCH_DEFAULT_LIMIT),
  category: z.enum(GLOBAL_SEARCH_CATEGORIES).optional(),
});

export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;

export function parseGlobalSearchQuery(input: unknown): GlobalSearchQuery {
  return globalSearchQuerySchema.parse(input);
}