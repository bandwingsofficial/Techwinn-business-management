'use client';

import { useEffect, useRef } from 'react';
import { isApiError } from '@/shared/api/api-error';
import { accessTokenStore, isAuthRefreshBackoffActive } from '@/shared/api/api-client';
import { pollMyPermissionEvents } from '../api/org-access';

const WAIT_MS = 10_000;
const MAX_BACKOFF_MS = 30_000;

/**
 * Long-polls tenant permission revision changes. On change, callers must
 * refetch `/me/permissions` — the event is never an authorization source.
 */
export function useOrgAccessPermissionRealtime(handlers: {
  onRevisionChange: (revision: string) => void;
  initialRevision?: string | null;
}): void {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const controller = new AbortController();
    let cursor: string | null = handlers.initialRevision ?? null;
    let failures = 0;
    let lastNotified = handlers.initialRevision ?? null;

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
          const response = await pollMyPermissionEvents(
            cursor,
            cursor === null ? 0 : WAIT_MS,
            controller.signal,
          );
          failures = 0;
          cursor = response.revision;
          if (response.changed && response.revision !== lastNotified) {
            lastNotified = response.revision;
            handlersRef.current.onRevisionChange(response.revision);
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
    // initialRevision only seeds the first cursor; later updates come from the poll loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once long poll
  }, []);
}
