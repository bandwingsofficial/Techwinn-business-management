import type { OrganizationCodeAvailabilityResponse } from '@techwin/validation';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';
import { apiRequest } from '@/shared/api/api-client';

export async function fetchOrganizationCodeAvailability(
  endpoint: string,
  code: string,
  options?: { excludeId?: string | null; extra?: Record<string, string> },
  signal?: AbortSignal,
): Promise<boolean> {
  const query = buildQueryString({
    code: code.trim(),
    ...(options?.excludeId ? { excludeId: options.excludeId } : {}),
    ...(options?.extra ?? {}),
  });
  const result = await apiRequest<OrganizationCodeAvailabilityResponse>(`${endpoint}${query}`, {
    auth: true,
    signal,
  });
  return result.available;
}