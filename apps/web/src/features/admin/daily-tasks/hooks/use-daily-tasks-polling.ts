'use client';

import { useEffect, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 20_000;

/** Refreshes task data on an interval while the document is visible (no WebSocket layer yet). */
export function useDailyTasksPolling(
  refresh: () => void | Promise<void>,
  enabled = true,
  intervalMs = DEFAULT_INTERVAL_MS,
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await refreshRef.current();
      } finally {
        inFlightRef.current = false;
      }
    };

    timer = setInterval(() => {
      void tick();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, intervalMs]);
}
