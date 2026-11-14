import type { LeaveYearConfigurationItem } from '@techwin/contracts';
import { LEAVE_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { createCoalescedRequest } from '@/shared/api/coalesced-request';

function normalizeLeaveYearConfigurationList(
  payload: unknown,
): readonly LeaveYearConfigurationItem[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    return [payload as LeaveYearConfigurationItem];
  }
  return [];
}

const coalescedYearConfigurations = createCoalescedRequest<readonly LeaveYearConfigurationItem[]>(
  async (signal) => {
    const payload = await apiRequest<unknown>(LEAVE_ROUTES.yearConfigurations, {
      auth: true,
      signal,
    });
    return normalizeLeaveYearConfigurationList(payload);
  },
  { ttlMs: 15_000 },
);

export function listLeaveYearConfigurationsCached(
  signal?: AbortSignal,
  options?: { readonly force?: boolean },
): Promise<readonly LeaveYearConfigurationItem[]> {
  return coalescedYearConfigurations.load(signal, options?.force === true);
}

export function invalidateLeaveYearConfigurationsCache(): void {
  coalescedYearConfigurations.invalidate();
}