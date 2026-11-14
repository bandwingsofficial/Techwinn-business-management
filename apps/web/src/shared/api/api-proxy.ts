import {
  ApiInternalUrlError,
  resolveApiInternalUrl,
} from './resolve-api-base-url';
import {
  buildBrowserResponseHeaders,
  buildUpstreamRequestHeaders,
} from './proxy-headers';

export function buildUpstreamApiUrl(
  requestUrl: string,
  pathSegments: readonly string[],
  upstreamOrigin: string,
): string {
  const joined = pathSegments.map(encodeURIComponent).join('/');
  const incoming = new URL(requestUrl);
  return `${upstreamOrigin}/api/v1/${joined}${incoming.search}`;
}

function misconfiguredResponse(error: unknown): Response {
  const message =
    error instanceof ApiInternalUrlError
      ? error.message
      : 'API proxy is misconfigured.';
  return Response.json(
    {
      statusCode: 503,
      error: {
        code: 'PROXY_MISCONFIGURED',
        message,
      },
    },
    { status: 503 },
  );
}

/**
 * Forwards a browser request to Nest and returns a browser-safe Response.
 * Strips compression metadata that would not match Node's auto-decoded body.
 */
export async function proxyApiRequest(
  request: Request,
  pathSegments: readonly string[],
  options?: {
    readonly apiInternalUrl?: string | undefined;
    readonly fetchImpl?: typeof fetch;
  },
): Promise<Response> {
  let upstreamOrigin: string;
  try {
    upstreamOrigin = resolveApiInternalUrl(
      options?.apiInternalUrl ?? process.env.API_INTERNAL_URL,
    );
  } catch (error) {
    return misconfiguredResponse(error);
  }

  const target = buildUpstreamApiUrl(request.url, pathSegments, upstreamOrigin);
  const method = request.method.toUpperCase();
  const headers = buildUpstreamRequestHeaders(request.headers);
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const fetchImpl = options?.fetchImpl ?? fetch;

  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  };
  if (hasBody) {
    init.body = request.body;
    init.duplex = 'half';
  }

  let upstream: Response;
  try {
    const proxyTimeoutMs = 120_000;
    upstream = await fetchImpl(target, {
      ...init,
      signal: AbortSignal.timeout(proxyTimeoutMs),
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError');
    return Response.json(
      {
        statusCode: 502,
        error: {
          code: 'BAD_GATEWAY',
          message: isTimeout
            ? 'The API service did not respond in time.'
            : 'Unable to reach the API service.',
        },
      },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildBrowserResponseHeaders(upstream),
  });
}
