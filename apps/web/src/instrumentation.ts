/**
 * Fail fast when the production web process starts without a valid Nest upstream.
 * `API_INTERNAL_URL` is read at runtime by the `/api/v1` App Router proxy — it is
 * not compiled into `next.config` rewrites and must not be baked as a client env.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { resolveApiInternalUrl } = await import('./shared/api/resolve-api-base-url');
  resolveApiInternalUrl(process.env.API_INTERNAL_URL);
}
