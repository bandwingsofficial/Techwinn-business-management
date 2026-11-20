import { GLOBAL_SEARCH_ROUTES, type GlobalSearchResponse } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';

export function searchGlobal(
  query: { q: string; limit?: number; category?: string },
  signal?: AbortSignal,
): Promise<GlobalSearchResponse> {
  return apiRequest<GlobalSearchResponse>(
    `${GLOBAL_SEARCH_ROUTES.search}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}