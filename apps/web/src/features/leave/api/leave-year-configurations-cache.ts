import type { LeaveYearConfigurationItem } from '@techwin/contracts';
import { LEAVE_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { createCoalescedRequest } from '@/shared/api/coalesced-request';

const coalescedYearConfigurations = createCoalescedRequest<readonly LeaveYearConfigurationItem[]>(
  (signal) =>
    apiRequest<readonly LeaveYearConfigurationItem[]>(LEAVE_ROUTES.yearConfigurations, {
      auth: true,
      signal,
    }),
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