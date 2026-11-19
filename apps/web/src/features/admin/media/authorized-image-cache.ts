import { accessTokenStore, refreshAccessToken } from '@/shared/api/api-client';
import { apiConfig } from '@/shared/api/api-config';
import { readCookie } from '@/shared/lib/cookies';

const MAX_CACHE_ENTRIES = 128;

const blobUrlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
/** Bumped on every clear so fetches started under a previous account never repopulate the cache. */
let generation = 0;
const generationListeners = new Set<() => void>();

export function getAuthorizedImageCacheGeneration(): number {
  return generation;
}

export function subscribeAuthorizedImageCache(listener: () => void): () => void {
  generationListeners.add(listener);
  return () => {
    generationListeners.delete(listener);
  };
}

/** API paths that require a bearer token (plain `<img src>` cannot load them). */
export function requiresAuthorizedImageFetch(resolved: string): boolean {
  if (resolved.startsWith('blob:')) return false;
  try {
    const path = resolved.startsWith('http')
      ? new URL(resolved).pathname
      : (resolved.split('?')[0] ?? resolved);
    return (
      path.includes('/media/objects/') ||
      path.includes('/employees/profile-images/') ||
      path.includes('/employees/profile-stored-objects/')
    );
  } catch {
    return false;
  }
}

export function peekAuthorizedImageBlobUrl(resolved: string): string | null {
  return blobUrlCache.get(resolved) ?? null;
}

/** Clears cached blobs when switching accounts — prevents showing another user's loaded images. */
export function clearAuthorizedImageCache(): void {
  for (const url of blobUrlCache.values()) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }
  blobUrlCache.clear();
  inflight.clear();
  generation += 1;
  for (const listener of generationListeners) listener();
}

let boundAccountId: string | null = null;

/**
 * Ties cached images to one signed-in account. Returns true when the account changed (e.g. a
 * different sign-in in another tab refreshed the shared cookie) and the cache was cleared.
 */
export function bindAuthorizedImageCacheToAccount(adminId: string): boolean {
  if (boundAccountId === adminId) return false;
  const changed = boundAccountId !== null;
  boundAccountId = adminId;
  if (changed) clearAuthorizedImageCache();
  return changed;
}

function trimCache(): void {
  while (blobUrlCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = blobUrlCache.keys().next().value;
    if (!oldestKey) break;
    const url = blobUrlCache.get(oldestKey);
    blobUrlCache.delete(oldestKey);
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }
}

/**
 * Responses are per-account (the API decides by session), so the HTTP cache must not serve one
 * account's image to the next sign-in on the same browser. Signed redirect targets are unique URLs.
 */
async function fetchWithAuth(resolved: string, signal: AbortSignal): Promise<Blob> {
  if (!accessTokenStore.get()) {
    await refreshAccessToken();
  }
  const headers = new Headers();
  const token = accessTokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const csrf = readCookie(apiConfig.csrfCookie);
  if (csrf) headers.set(apiConfig.csrfHeader, csrf);

  let response = await fetch(resolved, {
    headers,
    credentials: 'include',
    signal,
    cache: 'no-store',
    redirect: 'manual',
  });

  if (
    response.status === 301 ||
    response.status === 302 ||
    response.status === 307 ||
    response.status === 308
  ) {
    const location = response.headers.get('Location');
    if (location) {
      response = await fetch(location, { signal, cache: 'default' });
    }
  }

  if (response.status === 401) {
    const outcome = await refreshAccessToken();
    if (outcome === 'refreshed' && accessTokenStore.get()) {
      const retryHeaders = new Headers(headers);
      const retryToken = accessTokenStore.get();
      if (retryToken) retryHeaders.set('Authorization', `Bearer ${retryToken}`);
      response = await fetch(resolved, {
        headers: retryHeaders,
        credentials: 'include',
        signal,
        cache: 'no-store',
        redirect: 'manual',
      });
      if (
        response.status === 301 ||
        response.status === 302 ||
        response.status === 307 ||
        response.status === 308
      ) {
        const location = response.headers.get('Location');
        if (location) {
          response = await fetch(location, { signal, cache: 'default' });
        }
      }
    }
  }

  if (!response.ok) {
    throw new Error('Image request failed.');
  }
  return response.blob();
}

/** Loads an authorized image once; reuses blob URLs and dedupes concurrent requests. */
export function loadAuthorizedImageBlobUrl(
  resolved: string,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  const cached = blobUrlCache.get(resolved);
  if (cached) return Promise.resolve(cached);

  let pending = inflight.get(resolved);
  if (!pending) {
    const startedIn = generation;
    const request: Promise<string> = fetchWithAuth(resolved, new AbortController().signal)
      .then((blob) => {
        if (startedIn !== generation) {
          throw new DOMException('Aborted', 'AbortError');
        }
        const existing = blobUrlCache.get(resolved);
        if (existing) return existing;
        const url = URL.createObjectURL(blob);
        blobUrlCache.delete(resolved);
        blobUrlCache.set(resolved, url);
        trimCache();
        return url;
      })
      .finally(() => {
        if (inflight.get(resolved) === request) inflight.delete(resolved);
      });
    pending = request;
    inflight.set(resolved, pending);
  }

  return pending.then((url) => {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    return url;
  });
}
