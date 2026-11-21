import { ProblemDetailsSchema, type ProblemDetails } from '@noexcuse/contracts';
import { ApiError } from './errors';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface HttpRequest {
  readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  readonly path: string;
  readonly auth: boolean;
  readonly query?: URLSearchParams;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
}

export interface TransportOptions {
  readonly baseUrl: string;
  readonly getAccessToken: () => Promise<string | null>;
  readonly onRefresh: () => Promise<void>;
  readonly fetch: FetchLike;
  readonly requestTimeoutMs?: number;
}

// Covers one attempt end to end (headers and body). A stalled network must not leave the UI waiting forever.
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

const HTTP_NO_CONTENT = 204;
const HTTP_UNAUTHORIZED = 401;

const readProblem = async (response: Response): Promise<ProblemDetails | null> => {
  try {
    const parsed = ProblemDetailsSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    // A non-JSON error body (proxy page, gateway HTML) has no problem details; the caller maps it.
    return null;
  }
};

const httpError = async (response: Response): Promise<ApiError> => {
  const problem = await readProblem(response);
  if (!problem) {
    return new ApiError({
      code: 'INVALID_RESPONSE',
      status: response.status,
      requestId: null,
      detail: `HTTP ${response.status} without a problem+json body`,
    });
  }
  return new ApiError({
    code: problem.code,
    status: response.status,
    requestId: problem.requestId,
    detail: problem.detail,
    errors: problem.errors ?? [],
  });
};

const sessionExpired = async (response: Response): Promise<ApiError> => {
  const problem = await readProblem(response);
  return new ApiError({
    code: 'UNAUTHENTICATED',
    status: HTTP_UNAUTHORIZED,
    requestId: problem?.requestId ?? null,
    detail: 'Session is no longer valid',
  });
};

const readBody = async (response: Response): Promise<unknown> => {
  if (response.status === HTTP_NO_CONTENT) return undefined;
  try {
    return await response.json();
  } catch (cause) {
    throw new ApiError(
      { code: 'INVALID_RESPONSE', status: response.status, requestId: null, detail: 'Response body is not valid JSON' },
      { cause },
    );
  }
};

const networkError = (cause: unknown): ApiError =>
  new ApiError({ code: 'NETWORK_ERROR', status: null, requestId: null, detail: 'Network request failed' }, { cause });

export const createTransport = (options: TransportOptions) => {
  const { baseUrl, getAccessToken, onRefresh, fetch: fetchImpl } = options;
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const root = baseUrl.replace(/\/+$/, '');

  const dispatch = async (request: HttpRequest, signal: AbortSignal): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (request.auth) {
      const token = await getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    if (request.body !== undefined) headers['Content-Type'] = 'application/json';
    if (request.idempotencyKey !== undefined) headers['Idempotency-Key'] = request.idempotencyKey;

    const query = request.query?.toString();
    const url = `${root}${request.path}${query ? `?${query}` : ''}`;
    try {
      return await fetchImpl(url, {
        method: request.method,
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal,
      });
    } catch (cause) {
      throw networkError(cause);
    }
  };

  // The deadline is per attempt and is cleared before a refresh, so the refresh is not charged to the request.
  // A deadline abort, wherever it lands (headers or body), surfaces as NETWORK_ERROR, not as a body-parse failure.
  const attempt = async (request: HttpRequest, retried: boolean): Promise<unknown> => {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await dispatch(request, controller.signal);
      if (response.status === HTTP_UNAUTHORIZED && request.auth) {
        clearTimeout(deadline);
        if (retried) throw await sessionExpired(response);
        await onRefresh();
        return attempt(request, true);
      }
      if (!response.ok) throw await httpError(response);
      return await readBody(response);
    } catch (error) {
      if (controller.signal.aborted) throw networkError(error);
      throw error;
    } finally {
      clearTimeout(deadline);
    }
  };

  return { send: (request: HttpRequest): Promise<unknown> => attempt(request, false) };
};
