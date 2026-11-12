/** Bumps when sign-out or explicit refresh should bypass any client-side permission memoization. */
let generation = 0;
const listeners = new Set<() => void>();

export function invalidateMyPermissionsCache(): void {
  generation += 1;
  for (const listener of listeners) listener();
}

export function myPermissionsCacheGeneration(): number {
  return generation;
}

/** Subscribe to cache invalidation so open sessions reload effective permissions. */
export function subscribeMyPermissionsInvalidation(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
