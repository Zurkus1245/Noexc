import { act, renderHook } from '@testing-library/react-native';
import { useWeekNavigation } from './useWeekNavigation';

// Captures the focus callback the hook registers, so a test can simulate the screen regaining focus.
let mockFocusCallback: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    mockFocusCallback = callback;
  },
}));

const TIME_ZONE = 'Europe/Berlin';
// Sunday 22 Nov 2026, 23:30 in Berlin: still the Sunday, so the week starts on Monday 16 Nov.
const BEFORE_MIDNIGHT = new Date('2026-11-22T22:30:00.000Z');
// Monday 23 Nov 2026, 00:30 in Berlin: a new day and a new week.
const AFTER_MIDNIGHT = new Date('2026-11-22T23:30:00.000Z');

describe('useWeekNavigation', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: BEFORE_MIDNIGHT, doNotFake: ['setTimeout', 'clearTimeout', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'setInterval', 'clearInterval'] });
    mockFocusCallback = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts on the Monday of the week containing today in the given zone', async () => {
    const { result } = await renderHook(() => useWeekNavigation(TIME_ZONE));

    expect(result.current.today).toBe('2026-11-22');
    expect(result.current.weekStart).toBe('2026-11-16');
    expect(result.current.days).toHaveLength(7);
    expect(result.current.days[0]).toBe('2026-11-16');
  });

  it('recomputes today on focus so a screen kept mounted past midnight is not stale', async () => {
    const { result } = await renderHook(() => useWeekNavigation(TIME_ZONE));

    await act(async () => {
      jest.setSystemTime(AFTER_MIDNIGHT);
    });
    expect(result.current.today).toBe('2026-11-22');

    await act(async () => {
      mockFocusCallback?.();
    });

    expect(result.current.today).toBe('2026-11-23');
    expect(result.current.weekStart).toBe('2026-11-23');
  });

  it('moves the week by whole weeks and keeps today unchanged', async () => {
    const { result } = await renderHook(() => useWeekNavigation(TIME_ZONE));

    await act(async () => result.current.next());
    expect(result.current.weekStart).toBe('2026-11-23');

    await act(async () => result.current.prev());
    await act(async () => result.current.prev());
    expect(result.current.weekStart).toBe('2026-11-09');
    expect(result.current.today).toBe('2026-11-22');
  });
});
