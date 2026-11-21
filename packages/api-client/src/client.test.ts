import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, type FetchLike } from './index';
import { DEFAULT_REQUEST_TIMEOUT_MS } from './transport';

const BASE_URL = 'https://api.test';
const USER_ID = '123e4567-e89b-42d3-a456-426614174000';
const INVITE_ID = '223e4567-e89b-42d3-a456-426614174000';
const IDEMPOTENCY_KEY = '323e4567-e89b-42d3-a456-426614174000';
const INVITE_CODE = '0123456789ABCDEFGHJKMNPQRS';
const CREATED_AT = '2026-11-01T10:00:00.000Z';

const USER_PAYLOAD = {
  id: USER_ID,
  role: 'client',
  displayName: 'Ada',
  timezone: 'Europe/Berlin',
  createdAt: CREATED_AT,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const problem = (status: number, code: string, extra: Record<string, unknown> = {}) =>
  json(status, { type: 'about:blank', title: 'Problem', status, code, detail: 'Problem detail', requestId: 'req-1', ...extra });

const setup = (...outcomes: (Response | Error)[]) => {
  const fetch = vi.fn<FetchLike>();
  for (const outcome of outcomes) {
    if (outcome instanceof Response) fetch.mockResolvedValueOnce(outcome);
    else fetch.mockRejectedValueOnce(outcome);
  }
  const onRefresh = vi.fn(async () => undefined);
  const getAccessToken = vi.fn(async () => 'token-1');
  const client = createApiClient({ baseUrl: BASE_URL, getAccessToken, onRefresh, fetch });
  return { client, fetch, onRefresh, getAccessToken };
};

const captureError = async (promise: Promise<unknown>): Promise<unknown> => promise.catch((error: unknown) => error);

describe('createApiClient', () => {
  it('parses success responses, strips unknown fields and maps unknown enum values', async () => {
    const { client, fetch } = setup(json(200, { ...USER_PAYLOAD, role: 'future-role', extra: true }));

    const user = await client.me.get();

    expect(user).toEqual({ ...USER_PAYLOAD, role: 'unknown' });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/v1/me`);
    expect(init?.method).toBe('GET');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
  });

  it('maps problem+json responses to ApiError', async () => {
    const { client } = setup(
      problem(404, 'NOT_FOUND', { errors: [{ path: 'clientId', message: 'Not found' }] }),
    );

    const error = await captureError(client.me.get());

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      requestId: 'req-1',
      detail: 'Problem detail',
      errors: [{ path: 'clientId', message: 'Not found' }],
    });
  });

  it('throws NETWORK_ERROR when fetch rejects', async () => {
    const { client } = setup(new TypeError('connection reset'));

    const error = await captureError(client.me.get());

    expect(error).toMatchObject({ code: 'NETWORK_ERROR', status: null });
  });

  it('throws INVALID_RESPONSE for a non-JSON error body', async () => {
    const { client } = setup(new Response('<html>Bad gateway</html>', { status: 502 }));

    const error = await captureError(client.me.get());

    expect(error).toMatchObject({ code: 'INVALID_RESPONSE', status: 502 });
  });

  it('throws INVALID_RESPONSE when a success body violates the contract', async () => {
    const { client } = setup(json(200, { ...USER_PAYLOAD, timezone: 'Not/AZone' }));

    const error = await captureError(client.me.get());

    expect(error).toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('refreshes once and retries a 401 with the new token', async () => {
    const { client, fetch, onRefresh, getAccessToken } = setup(
      problem(401, 'UNAUTHENTICATED'),
      json(200, USER_PAYLOAD),
    );
    getAccessToken.mockResolvedValueOnce('token-1').mockResolvedValueOnce('token-2');

    const user = await client.me.get();

    expect(user.id).toBe(USER_ID);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    const retryHeaders = fetch.mock.calls[1]?.[1]?.headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe('Bearer token-2');
  });

  it('throws UNAUTHENTICATED when the retry is also a 401', async () => {
    const { client, fetch, onRefresh } = setup(problem(401, 'UNAUTHENTICATED'), problem(401, 'UNAUTHENTICATED'));

    const error = await captureError(client.me.get());

    expect(error).toMatchObject({ code: 'UNAUTHENTICATED', status: 401, requestId: 'req-1' });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('sends the Idempotency-Key header on POST mutations', async () => {
    const { client, fetch } = setup(
      json(200, { id: INVITE_ID, code: INVITE_CODE, expiresAt: CREATED_AT }),
    );

    await client.invites.create({ idempotencyKey: IDEMPOTENCY_KEY });

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/v1/invites`);
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)['Idempotency-Key']).toBe(IDEMPOTENCY_KEY);
  });

  it('rejects a malformed idempotency key before fetch', async () => {
    const { client, fetch } = setup();

    const error = await captureError(client.invites.create({ idempotencyKey: 'not-a-uuid' }));

    expect(error).toMatchObject({ code: 'INVALID_REQUEST' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws INVALID_REQUEST for an invalid body before fetch', async () => {
    const { client, fetch } = setup();

    const error = await captureError(
      client.me.create({ role: 'coach', displayName: '', timezone: 'Europe/Berlin' }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'INVALID_REQUEST', status: null });
    expect((error as ApiError).errors).toEqual([expect.objectContaining({ path: 'displayName' })]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends cursor pagination parameters', async () => {
    const { client, fetch } = setup(json(200, { items: [], nextCursor: null }));

    const page = await client.coach.listClients({ limit: 5, cursor: 'abc' });

    expect(page).toEqual({ items: [], nextCursor: null });
    expect(fetch.mock.calls[0]?.[0]).toBe(`${BASE_URL}/v1/coach/clients?limit=5&cursor=abc`);
  });

  it('resolves 204 endpoints without parsing a body', async () => {
    const { client } = setup(new Response(null, { status: 204 }));

    await expect(client.me.delete()).resolves.toBeUndefined();
  });
});

describe('coach and client links', () => {
  const CLIENT_ID = '423e4567-e89b-42d3-a456-426614174000';
  const LINK = {
    id: INVITE_ID,
    coachId: USER_ID,
    clientId: CLIENT_ID,
    status: 'active',
    createdAt: CREATED_AT,
    endedAt: null,
    endedBy: null,
  };
  const DETAIL = { link: LINK, client: { id: CLIENT_ID, displayName: 'Ada', timezone: 'Europe/Berlin' } };
  const LINK_SUMMARY = { id: INVITE_ID, coachId: USER_ID, coachDisplayName: 'Coach', status: 'paused', createdAt: CREATED_AT };

  it('fetches a client detail for the coach and parses it', async () => {
    const { client, fetch } = setup(json(200, DETAIL));

    const detail = await client.coach.getClient(CLIENT_ID);

    expect(detail).toEqual(DETAIL);
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/v1/coach/clients/${CLIENT_ID}`);
    expect(init?.method).toBe('GET');
  });

  it('rejects a malformed client id before fetch', async () => {
    const { client, fetch } = setup();

    const error = await captureError(client.coach.getClient('not-a-uuid'));

    expect(error).toMatchObject({ code: 'INVALID_REQUEST' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps a foreign or hidden client to NOT_FOUND', async () => {
    const { client } = setup(problem(404, 'NOT_FOUND'));

    await expect(client.coach.getClient(CLIENT_ID)).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('lists a page of own client links with the coach display name', async () => {
    const { client, fetch } = setup(json(200, { items: [LINK_SUMMARY], nextCursor: 'next-1' }));

    expect(await client.links.listOwn({ limit: 5, cursor: 'cur-1' })).toEqual({
      items: [LINK_SUMMARY],
      nextCursor: 'next-1',
    });
    expect(fetch.mock.calls[0]?.[0]).toBe(`${BASE_URL}/v1/client/links?limit=5&cursor=cur-1`);
  });

  it('requests the default page size when no query is given', async () => {
    const { client, fetch } = setup(json(200, { items: [], nextCursor: null }));

    await client.links.listOwn();

    expect(fetch.mock.calls[0]?.[0]).toBe(`${BASE_URL}/v1/client/links?limit=20`);
  });

  it('rejects an invalid page query before fetch', async () => {
    const { client, fetch } = setup();

    await expect(client.links.listOwn({ limit: 101 })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects the bare array shape from the client links endpoint', async () => {
    const { client } = setup(json(200, [LINK_SUMMARY]));

    await expect(client.links.listOwn()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});

describe('request timeout', () => {
  // A fake fetch that never answers, but rejects once its signal aborts, as the platform fetch does.
  const stalledFetch = vi.fn<FetchLike>(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }),
  );
  const clientWith = (requestTimeoutMs?: number) =>
    createApiClient({
      baseUrl: BASE_URL,
      getAccessToken: async () => 'token-1',
      onRefresh: async () => undefined,
      fetch: stalledFetch,
      requestTimeoutMs,
    });

  beforeEach(() => {
    stalledFetch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fails a stalled request with NETWORK_ERROR after the default timeout', async () => {
    const outcome = captureError(clientWith().me.get());

    await vi.advanceTimersByTimeAsync(DEFAULT_REQUEST_TIMEOUT_MS);

    expect(await outcome).toMatchObject({ code: 'NETWORK_ERROR', status: null });
    expect(stalledFetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('uses the configured timeout and does not abort before it elapses', async () => {
    const outcome = captureError(clientWith(250).me.get());

    await vi.advanceTimersByTimeAsync(249);
    expect(stalledFetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
