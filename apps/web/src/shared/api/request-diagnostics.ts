/**
 * Dev/test-only API request accounting. No tokens or bodies are recorded.
 * Production builds keep this inert unless explicitly enabled for a session.
 */

export type RequestTrigger =
  | 'user'
  | 'effect'
  | 'poll'
  | 'navigation'
  | 'retry'
  | 'unknown';

export type RequestDiagnosticEvent = {
  readonly at: number;
  readonly method: string;
  readonly path: string;
  readonly trigger: RequestTrigger;
  readonly source?: string;
};

type DiagnosticsState = {
  enabled: boolean;
  events: RequestDiagnosticEvent[];
  listeners: Set<(event: RequestDiagnosticEvent) => void>;
};

const GLOBAL_KEY = '__techwinRequestDiagnostics';

function state(): DiagnosticsState {
  const globalRecord = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: DiagnosticsState;
  };
  globalRecord[GLOBAL_KEY] ??= {
    enabled: process.env.NODE_ENV !== 'production',
    events: [],
    listeners: new Set(),
  };
  return globalRecord[GLOBAL_KEY];
}

export function enableRequestDiagnostics(enabled = true): void {
  state().enabled = enabled;
}

export function clearRequestDiagnostics(): void {
  state().events = [];
}

export function getRequestDiagnostics(): readonly RequestDiagnosticEvent[] {
  return state().events;
}

export function countRequestsMatching(
  predicate: (event: RequestDiagnosticEvent) => boolean,
): number {
  return state().events.filter(predicate).length;
}

export function onRequestDiagnostic(
  listener: (event: RequestDiagnosticEvent) => void,
): () => void {
  state().listeners.add(listener);
  return () => state().listeners.delete(listener);
}

export function recordApiRequest(input: {
  readonly method?: string;
  readonly path: string;
  readonly trigger?: RequestTrigger;
  readonly source?: string;
}): void {
  const current = state();
  if (!current.enabled) return;
  const event: RequestDiagnosticEvent = {
    at: Date.now(),
    method: (input.method ?? 'GET').toUpperCase(),
    path: input.path.split('?')[0] ?? input.path,
    trigger: input.trigger ?? 'unknown',
    source: input.source,
  };
  current.events.push(event);
  if (current.events.length > 500) {
    current.events.splice(0, current.events.length - 500);
  }
  for (const listener of current.listeners) listener(event);
}

/** Detects burst of identical path+method within a window (possible render loop). */
export function identicalRequestBurstCount(
  pathPrefix: string,
  windowMs = 2_000,
): number {
  const now = Date.now();
  const normalized = pathPrefix.split('?')[0] ?? pathPrefix;
  return state().events.filter(
    (event) =>
      event.at >= now - windowMs &&
      (event.path === normalized || event.path.startsWith(normalized)),
  ).length;
}
