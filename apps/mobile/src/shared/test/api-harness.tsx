import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { ApiProvider } from '../api/api-context';
import { useSession } from '../session/session-store';

export const TEST_TOKEN = 'test-access-token';
export const USER_ID = '11111111-1111-4111-8111-111111111111';
export const CLIENT_ID = '22222222-2222-4222-8222-222222222222';
export const CREATED_AT = '2026-11-02T10:00:00.000Z';

export interface RecordedRequest {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
  readonly idempotencyKey: string | undefined;
}

export interface StubResponse {
  readonly status?: number;
  readonly body?: unknown;
}

// Replaces global fetch for the API client; the handler answers each request by method and path.
export const stubFetch = (handler: (request: RecordedRequest) => StubResponse): RecordedRequest[] => {
  const requests: RecordedRequest[] = [];
  global.fetch = jest.fn(async (input: string, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const request: RecordedRequest = {
      method: init?.method ?? 'GET',
      path: new URL(input).pathname,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      idempotencyKey: headers['Idempotency-Key'],
    };
    requests.push(request);
    const { status = 200, body } = handler(request);
    return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
  }) as unknown as typeof fetch;
  return requests;
};

export const problem = (status: number, code: string) => ({
  type: 'about:blank',
  title: code,
  status,
  code,
  detail: code,
  requestId: 'request-1',
});

export const signInTestSession = () => {
  useSession.setState({ token: TEST_TOKEN, hydration: 'ready', storedTokenNotRemoved: false });
};

// RNTL 13+ renders asynchronously; callers await it so `screen` is bound to this render.
export const renderWithApi = async (ui: ReactElement) => {
  // gcTime 0: cached entries leave no timers behind, so Jest can exit after the suite.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApiProvider>{ui}</ApiProvider>
    </QueryClientProvider>,
  );
};
