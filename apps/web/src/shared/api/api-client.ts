import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import { readCookie } from '@/shared/lib/cookies';
import { apiConfig } from './api-config';
import { ApiError, isApiError } from './api-error';
import { accessTokenStore } from './access-token-store';
import { shouldNotifySessionEnded, shouldSuppressSessionEnded } from './session-ended';
import { recordApiRequest } from './request-diagnostics';

export { accessTokenStore } from './access-token-store';

/**
 * The single HTTP entry point of the web app.
 *
 * - The access token lives only in this module's memory (never in web storage);
 *   a page reload restores it through the refresh cookie.
 * - Concurrent refreshes are collapsed into one request per tab, and the Web
 *   Locks API serializes rotation across tabs so a rotated refresh token is
 *   never replayed (which the API treats as theft).
 * - An authenticated request is retried at most once after a successful refresh.
 * - The refresh endpoint itself never triggers another refresh (`skipAuthRefresh`).
 */

export type RefreshOutcome = 'refreshed' | 'unauthenticated';
type SessionRefresher = () => Promise<RefreshOutcome>;
type SessionEndedListener = () => void;
type AccessDeniedListener = (error: ApiError) => void;

export interface ApiRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  readonly body?: unknown;
  /** Attach the in-memory access token and refresh it when it has expired. */
  readonly auth?: boolean;
  /** Echo the CSRF cookie for cookie-authenticated endpoints. */
  readonly csrf?: boolean;
  readonly signal?: AbortSignal;
  /**
   * When true, never attempt session refresh before or after this call.
   * Required for the refresh endpoint itself to prevent recursive refresh loops.
   */
  readonly skipAuthRefresh?: boolean;
}

/** 401 codes that a refresh can fix. Anything else is final. */
const REFRESHABLE_CODES: ReadonlySet<ApiErrorCode | null> = new Set([
  API_ERROR_CODES.ACCESS_TOKEN_INVALID,
  API_ERROR_CODES.UNAUTHENTICATED,
]);

const SESSION_RUNTIME_KEY = '__techwinPlatformSessionRuntime';

type SessionRuntime = {
  refresher: SessionRefresher | null;
  inFlight: Promise<RefreshOutcome> | null;
  /** Soft cooldown after refresh 429 so we do not immediately re-storm. */
  refreshCooldownUntilMs: number;
  /** After 5xx / network refresh failures, pause new refresh attempts briefly. */
  refreshTransientCooldownUntilMs: number;
  sessionEndedListeners: Set<SessionEndedListener>;
  accessDeniedListeners: Set<AccessDeniedListener>;
};

function sessionRuntime(): SessionRuntime {
  const globalRecord = globalThis as typeof globalThis & {
    [SESSION_RUNTIME_KEY]?: SessionRuntime;
  };
  globalRecord[SESSION_RUNTIME_KEY] ??= {
    refresher: null,
    inFlight: null,
    refreshCooldownUntilMs: 0,
    refreshTransientCooldownUntilMs: 0,
    sessionEndedListeners: new Set(),
    accessDeniedListeners: new Set(),
  };
  return globalRecord[SESSION_RUNTIME_KEY];
}

const ACCESS_DENIED_CODES: ReadonlySet<ApiErrorCode | null> = new Set([
  API_ERROR_CODES.FORBIDDEN,
  API_ERROR_CODES.MEMBERSHIP_DENIED,
]);

export function hasCsrfCookie(): boolean {
  return readCookie(apiConfig.csrfCookie) !== null;
}

/** Registers the feature-level function that performs a refresh-token rotation. */
export function registerSessionRefresher(refresher: SessionRefresher | null): void {
  sessionRuntime().refresher = refresher;
}

/** Notified when the session is definitively gone (refresh rejected). */
export function onSessionEnded(listener: SessionEndedListener): () => void {
  const listeners = sessionRuntime().sessionEndedListeners;
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Notified when an authenticated request is rejected with 403 (permissions may have changed). */
export function onAccessDenied(listener: AccessDeniedListener): () => void {
  const listeners = sessionRuntime().accessDeniedListeners;
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyAccessDenied(error: ApiError): void {
  if (error.status !== 403 || !ACCESS_DENIED_CODES.has(error.code)) return;
  for (const listener of sessionRuntime().accessDeniedListeners) listener(error);
}

function notifySessionEnded(): void {
  if (shouldSuppressSessionEnded()) return;
  accessTokenStore.clear();
  for (const listener of sessionRuntime().sessionEndedListeners) listener();
}

async function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request(apiConfig.refreshLockName, task);
  }
  return task();
}

function rateLimitedRefreshError(retryAfterSeconds: number): ApiError {
  return new ApiError(
    'http',
    'Too many authentication requests. Please wait a moment and try again.',
    429,
    API_ERROR_CODES.RATE_LIMITED,
    [],
    null,
    retryAfterSeconds,
  );
}

const REFRESH_TRANSIENT_COOLDOWN_MS = 3_000;

function transientRefreshCooldownError(retryAfterSeconds: number): ApiError {
  return new ApiError(
    'http',
    'Unable to refresh your session right now. Try again in a moment.',
    503,
    null,
    [],
    null,
    retryAfterSeconds,
  );
}

function isRefreshPath(path: string): boolean {
  return path.includes('/auth/platform/refresh');
}

/** Single-flight refresh shared by every caller in this tab (and across chunk copies). */
export function refreshAccessToken(): Promise<RefreshOutcome> {
  const state = sessionRuntime();
  if (!state.refresher) return Promise.resolve('unauthenticated');

  if (state.inFlight) return state.inFlight;

  const now = Date.now();
  if (now < state.refreshCooldownUntilMs) {
    const retryAfterSeconds = Math.max(1, Math.ceil((state.refreshCooldownUntilMs - now) / 1000));
    return Promise.reject(rateLimitedRefreshError(retryAfterSeconds));
  }

  if (now < state.refreshTransientCooldownUntilMs) {
    const existing = accessTokenStore.get();
    if (existing) return Promise.resolve('refreshed');
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((state.refreshTransientCooldownUntilMs - now) / 1000),
    );
    return Promise.reject(transientRefreshCooldownError(retryAfterSeconds));
  }

  const refresher = state.refresher;
  state.inFlight = withCrossTabLock(async () => {
    try {
      const outcome = await refresher();
      if (outcome === 'unauthenticated') notifySessionEnded();
      return outcome;
    } catch (error) {
      if (isApiError(error) && error.status === 429) {
        const waitSeconds = Math.max(1, error.retryAfterSeconds ?? 5);
        state.refreshCooldownUntilMs = Date.now() + waitSeconds * 1000;
      } else if (isApiError(error) && error.isTransient) {
        state.refreshTransientCooldownUntilMs = Date.now() + REFRESH_TRANSIENT_COOLDOWN_MS;
      }
      throw error;
    }
  }).finally(() => {
    state.inFlight = null;
  });
  return state.inFlight;
}

async function send(path: string, options: ApiRequestOptions): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' });
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  const token = accessTokenStore.get();
  if (options.auth && token) headers.set('Authorization', `Bearer ${token}`);
  if (options.csrf) {
    const csrfToken = readCookie(apiConfig.csrfCookie);
    if (csrfToken) headers.set(apiConfig.csrfHeader, csrfToken);
  }

  const timeout = AbortSignal.timeout(apiConfig.requestTimeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  try {
    return await fetch(`${apiConfig.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? null : JSON.stringify(options.body),
      credentials: 'include',
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timeout.aborted) throw new ApiError('timeout', 'The server took too long to respond.');
    throw new ApiError(
      'network',
      'Unable to reach the server. Check your connection and try again.',
    );
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 205) return undefined as T;
  const text = await response.text();
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

function canAttemptRefresh(options: ApiRequestOptions): boolean {
  return Boolean(options.auth && !options.skipAuthRefresh && sessionRuntime().refresher);
}

async function ensureAccessToken(options: ApiRequestOptions): Promise<void> {
  if (!canAttemptRefresh(options) || accessTokenStore.get()) return;
  const outcome = await refreshAccessToken();
  if (outcome === 'unauthenticated') {
    throw new ApiError('http', 'Your session has ended.', 401, API_ERROR_CODES.SESSION_EXPIRED);
  }
}

async function retryAfterRefresh<T>(
  path: string,
  options: ApiRequestOptions,
  firstError: ApiError,
  afterOk: (response: Response) => Promise<T>,
): Promise<T> {
  if (isRefreshPath(path)) {
    throw firstError;
  }

  const outcome = await refreshAccessToken();
  if (outcome === 'unauthenticated') {
    if (shouldNotifySessionEnded(firstError)) notifySessionEnded();
    throw firstError;
  }

  const retried = await send(path, options);
  if (retried.ok) return afterOk(retried);
  const retryError = await ApiError.fromResponse(retried);
  if (retried.status === 401 && shouldNotifySessionEnded(retryError)) notifySessionEnded();
  if (options.auth) notifyAccessDenied(retryError);
  throw retryError;
}

export async function apiBinaryRequest(path: string, options: ApiRequestOptions = {}): Promise<Blob> {
  recordApiRequest({ method: options.method ?? 'GET', path });
  await ensureAccessToken(options);

  const response = await send(path, { ...options, method: options.method ?? 'GET' });
  if (response.ok) return response.blob();

  const error = await ApiError.fromResponse(response);
  if (
    !(
      canAttemptRefresh(options) &&
      response.status === 401 &&
      REFRESHABLE_CODES.has(error.code)
    )
  ) {
    if (options.auth && shouldNotifySessionEnded(error)) notifySessionEnded();
    if (options.auth) notifyAccessDenied(error);
    throw error;
  }

  return retryAfterRefresh(path, { ...options, method: options.method ?? 'GET' }, error, (r) =>
    r.blob(),
  );
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  recordApiRequest({ method: options.method ?? 'GET', path });
  await ensureAccessToken(options);

  const response = await send(path, options);
  if (response.ok) return parse<T>(response);

  const error = await ApiError.fromResponse(response);
  // Never treat rate limits as refreshable auth failures.
  if (response.status === 429) {
    throw error;
  }
  if (
    !(
      canAttemptRefresh(options) &&
      response.status === 401 &&
      REFRESHABLE_CODES.has(error.code)
    )
  ) {
    if (options.auth && shouldNotifySessionEnded(error)) notifySessionEnded();
    if (options.auth) notifyAccessDenied(error);
    throw error;
  }

  return retryAfterRefresh(path, options, error, (r) => parse<T>(r));
}
