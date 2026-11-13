'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { fetchAttendanceSettings } from '@/features/attendance/api/attendance';

export function useAttendanceOrgTimeZone(enabled = true): string {
  const { hasAny } = usePermissions();
  const canReadAttendanceSettings = hasAny(
    'attendance.manage_settings',
    'calendar.view',
    'calendar.view_all',
    'attendance.view_own',
  );
  const [timeZone, setTimeZone] = useState('UTC');

  useEffect(() => {
    if (!enabled || !canReadAttendanceSettings) return;
    let cancelled = false;
    void fetchAttendanceSettings()
      .then((settings) => {
        if (cancelled) return;
        setTimeZone(settings.current?.timeZone?.trim() || 'UTC');
      })
      .catch(() => {
        if (!cancelled) setTimeZone('UTC');
      });
    return () => {
      cancelled = true;
    };
  }, [canReadAttendanceSettings, enabled]);

  return timeZone;
}
