import { ApiError } from '@noexcuse/api-client';
import { renderHook } from '@testing-library/react-native';
import { randomUUID } from 'expo-crypto';
import { useIdempotencyKey } from './idempotency';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));

const mockedRandomUUID = jest.mocked(randomUUID);
const networkError = new ApiError({ code: 'NETWORK_ERROR', status: null, requestId: null, detail: 'offline' });
const serverError = new ApiError({ code: 'LINK_EXISTS', status: 409, requestId: 'r-1', detail: 'already linked' });

describe('useIdempotencyKey', () => {
  beforeEach(() => {
    mockedRandomUUID.mockReset();
  });

  it('reuses the key for retries of the same intent', async () => {
    mockedRandomUUID.mockReturnValueOnce('key-1');
    const { result } = await renderHook(() => useIdempotencyKey());

    expect(result.current.keyFor({ code: 'A' })).toBe('key-1');
    expect(result.current.keyFor({ code: 'A' })).toBe('key-1');
    expect(mockedRandomUUID).toHaveBeenCalledTimes(1);
  });

  it('issues a new key for a different intent', async () => {
    mockedRandomUUID.mockReturnValueOnce('key-1').mockReturnValueOnce('key-2');
    const { result } = await renderHook(() => useIdempotencyKey());

    expect(result.current.keyFor({ code: 'A' })).toBe('key-1');
    expect(result.current.keyFor({ code: 'B' })).toBe('key-2');
  });

  it('keeps the key after a network failure so the retry replays on the server', async () => {
    mockedRandomUUID.mockReturnValueOnce('key-1');
    const { result } = await renderHook(() => useIdempotencyKey());

    result.current.keyFor('link-1');
    result.current.settle(networkError);

    expect(result.current.keyFor('link-1')).toBe('key-1');
  });

  it('clears the key once the server answered, with an error or success', async () => {
    mockedRandomUUID.mockReturnValueOnce('key-1').mockReturnValueOnce('key-2').mockReturnValueOnce('key-3');
    const { result } = await renderHook(() => useIdempotencyKey());

    result.current.keyFor('link-1');
    result.current.settle(serverError);
    expect(result.current.keyFor('link-1')).toBe('key-2');

    result.current.settle(undefined);
    expect(result.current.keyFor('link-1')).toBe('key-3');
  });
});
