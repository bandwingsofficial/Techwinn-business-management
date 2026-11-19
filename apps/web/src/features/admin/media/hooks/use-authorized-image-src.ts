'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  getAuthorizedImageCacheGeneration,
  loadAuthorizedImageBlobUrl,
  peekAuthorizedImageBlobUrl,
  requiresAuthorizedImageFetch,
  subscribeAuthorizedImageCache,
} from '../authorized-image-cache';

interface LoadResult {
  readonly resolved: string;
  readonly generation: number;
  readonly src: string | null;
  readonly failed: boolean;
}

/**
 * The returned src always belongs to the current `resolved` URL and the current account's cache
 * generation — a previous image is never shown while the next one loads.
 */
export function useAuthorizedImageSrc(resolved: string | null): {
  readonly displaySrc: string | null;
  readonly loading: boolean;
  readonly failed: boolean;
} {
  const generation = useSyncExternalStore(
    subscribeAuthorizedImageCache,
    getAuthorizedImageCacheGeneration,
    () => 0,
  );
  const [result, setResult] = useState<LoadResult | null>(null);

  const needsFetch = resolved ? requiresAuthorizedImageFetch(resolved) : false;
  const cached = resolved && needsFetch ? peekAuthorizedImageBlobUrl(resolved) : null;

  useEffect(() => {
    if (!resolved || !needsFetch || cached) return;
    const controller = new AbortController();
    void loadAuthorizedImageBlobUrl(resolved, controller.signal)
      .then((url) => {
        if (controller.signal.aborted) return;
        setResult({ resolved, generation, src: url, failed: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setResult({ resolved, generation, src: null, failed: true });
      });
    return () => {
      controller.abort();
    };
  }, [resolved, needsFetch, cached, generation]);

  if (!resolved) return { displaySrc: null, loading: false, failed: false };
  if (!needsFetch) return { displaySrc: resolved, loading: false, failed: false };
  if (cached) return { displaySrc: cached, loading: false, failed: false };

  const current =
    result && result.resolved === resolved && result.generation === generation ? result : null;
  return {
    displaySrc: current?.src ?? null,
    loading: current === null,
    failed: current?.failed ?? false,
  };
}
