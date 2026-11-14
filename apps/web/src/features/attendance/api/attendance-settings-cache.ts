import type { AttendanceSettingsResponse } from '@techwin/contracts';
import { ATTENDANCE_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { createCoalescedRequest } from '@/shared/api/coalesced-request';

const coalescedAttendanceSettings = createCoalescedRequest<AttendanceSettingsResponse>(
  (signal) => apiRequest<AttendanceSettingsResponse>(ATTENDANCE_ROUTES.settings, { auth: true, signal }),
  { ttlMs: 30_000 },
);

export function fetchAttendanceSettingsCached(
  signal?: AbortSignal,
  options?: { readonly force?: boolean },
): Promise<AttendanceSettingsResponse> {
  return coalescedAttendanceSettings.load(signal, options?.force === true);
}

export function invalidateAttendanceSettingsCache(): void {
  coalescedAttendanceSettings.invalidate();
}