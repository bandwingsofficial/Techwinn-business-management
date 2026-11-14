type CacheEntry<T> = {
  readonly value: T;
  readonly at: number;
};

/**
 * Deduplicates in-flight GETs and optionally serves a short-lived cached value.
 * Invalidate via {@link CoalescedRequest.invalidate}.
 */
export function createCoalescedRequest<T>(
  fetcher: (signal?: AbortSignal) => Promise<T>,
  options?: { readonly ttlMs?: number },
) {
  const ttlMs = options?.ttlMs ?? 10_000;
  let cache: CacheEntry<T> | null = null;
  let inflight: Promise<T> | null = null;

  async function load(signal?: AbortSignal, force = false): Promise<T> {
    if (!force && cache && Date.now() - cache.at < ttlMs) {
      return cache.value;
    }
    // A forced load must not join a stale in-flight fetch (e.g. React Strict Mode
    // abort on the first mount would cancel the shared promise for the second).
    if (!force && inflight) {
      return inflight;
    }
    inflight = fetcher(signal)
      .then((value) => {
        cache = { value, at: Date.now() };
        inflight = null;
        return value;
      })
      .catch((error) => {
        inflight = null;
        throw error;
      });
    return inflight;
  }

  function invalidate(): void {
    cache = null;
  }

  return { load, invalidate };
}