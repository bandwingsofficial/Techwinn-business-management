'use client';

import { useEffect, useRef } from 'react';
import { isApiError } from '@/shared/api/api-error';
import { accessTokenStore, isAuthRefreshBackoffActive } from '@/shared/api/api-client';
import { pollDailyTaskRealtimeEvents } from '../api/daily-tasks';

const WAIT_MS = 10_000;
const MAX_BACKOFF_MS = 30_000;

/** Long-polls assignment/task events scoped to the signed-in admin; refetch authoritative lists on delivery. */
export function useDailyTasksRealtime(onEvents: () => void | Promise<void>, enabled = true): void {
  const onEventsRef = useRef(onEvents);
  useEffect(() => {
    onEventsRef.current = onEvents;
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let cursor: string | null = null;
    let failures = 0;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve();
        });
      });

    const run = async () => {
      while (!controller.signal.aborted) {
        if (!accessTokenStore.get() && isAuthRefreshBackoffActive()) {
          await sleep(Math.min(MAX_BACKOFF_MS, 5_000));
          continue;
        }
        try {
          const response = await pollDailyTaskRealtimeEvents(
            cursor,
            cursor === null ? 0 : WAIT_MS,
            controller.signal,
          );
          failures = 0;
          cursor = response.cursor;
          if (response.resync) {
            await onEventsRef.current();
            continue;
          }
          if (response.events.length > 0) {
            await onEventsRef.current();
          }
          if (document.hidden) await sleep(2_000);
        } catch (error) {
          if (controller.signal.aborted) return;
          if (isApiError(error) && (error.status === 401 || error.status === 403)) {
            await sleep(MAX_BACKOFF_MS);
            continue;
          }
          failures += 1;
          const transientBackoff = isApiError(error) && error.isTransient;
          const baseMs = transientBackoff ? 5_000 : 1_000;
          await sleep(Math.min(MAX_BACKOFF_MS, baseMs * 2 ** Math.min(failures, 5)));
        }
      }
    };

    void run();
    return () => controller.abort();
  }, [enabled]);
}