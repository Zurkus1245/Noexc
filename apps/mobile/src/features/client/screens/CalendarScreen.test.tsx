import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { CLIENT_ID, USER_ID, renderWithApi, signInTestSession, stubFetch, type RecordedRequest } from '../../../shared/test/api-harness';
import { CalendarScreen } from './CalendarScreen';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

jest.mock('expo-router', () => ({
  useFocusEffect: () => undefined,
}));

// Wednesday of the week 2026-11-16 .. 2026-11-22 in Europe/Berlin.
const NOW = new Date('2026-11-18T12:00:00.000Z');
const WEEK_FROM = '2026-11-16';
const WEEK_TO = '2026-11-22';
const NEXT_FROM = '2026-11-23';
const NEXT_TO = '2026-11-29';
const CALENDAR_PATH = '/v1/client/calendar';
const ENTRY_ID = '33333333-3333-4333-8333-333333333333';
const WORKOUT_KEY = '44444444-4444-4444-8444-444444444444';
const EXERCISE_KEY = '55555555-5555-4555-8555-555555555555';
const BLOCK_TITLE = 'Strength block';
const WORKOUT_TITLE = 'Leg day';
const EXERCISE_NAME = 'Back squat';
const EMPTY_WEEK = 'Nothing scheduled this week.';
const NEXT_WEEK_LABEL = 'Next week';

const profile = {
  id: USER_ID,
  role: 'client',
  displayName: 'Anna',
  timezone: 'Europe/Berlin',
  createdAt: '2026-11-02T10:00:00.000Z',
};

const entry = {
  id: ENTRY_ID,
  linkId: USER_ID,
  clientId: CLIENT_ID,
  coachId: USER_ID,
  date: '2026-11-18',
  workoutKey: WORKOUT_KEY,
  blockTitle: BLOCK_TITLE,
  workout: {
    key: WORKOUT_KEY,
    title: WORKOUT_TITLE,
    exercises: [
      { key: EXERCISE_KEY, name: EXERCISE_NAME, sets: 3, repsMin: 5, repsMax: 8, weightKg: 100, restSec: 180, note: null },
    ],
  },
};

const calendarHandler = (items: unknown[]) => (request: RecordedRequest) => {
  if (request.path === '/v1/me') return { body: profile };
  return { body: { items } };
};

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['setTimeout', 'clearTimeout', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'setInterval', 'clearInterval'] });
    signInTestSession();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the week entries with workout, block and coach, and expands exercises on tap', async () => {
    const requests = stubFetch(calendarHandler([entry]));
    await renderWithApi(<CalendarScreen />);

    expect(await screen.findByText(WORKOUT_TITLE)).toBeTruthy();
    expect(screen.getByText(BLOCK_TITLE)).toBeTruthy();
    expect(screen.getByText('From your coach')).toBeTruthy();
    expect(screen.queryByText(EXERCISE_NAME)).toBeNull();

    await fireEvent.press(screen.getByText(WORKOUT_TITLE));

    expect(screen.getByText(EXERCISE_NAME)).toBeTruthy();
    expect(screen.getByText('3 sets × 5–8 reps')).toBeTruthy();
    expect(screen.getByText('100 kg · 180 s rest')).toBeTruthy();
    expect(requests.find((request) => request.path === CALENDAR_PATH)?.query).toEqual({ from: WEEK_FROM, to: WEEK_TO });
  });

  it('shows the empty state when the week has no entries', async () => {
    stubFetch(calendarHandler([]));
    await renderWithApi(<CalendarScreen />);

    expect(await screen.findByText(EMPTY_WEEK)).toBeTruthy();
  });

  it('fetches the next week range when moving forward', async () => {
    const requests = stubFetch(calendarHandler([]));
    await renderWithApi(<CalendarScreen />);
    await screen.findByText(EMPTY_WEEK);

    await fireEvent.press(screen.getByRole('button', { name: NEXT_WEEK_LABEL }));

    await waitFor(() => {
      const calendarRequests = requests.filter((request) => request.path === CALENDAR_PATH);
      expect(calendarRequests.at(-1)?.query).toEqual({ from: NEXT_FROM, to: NEXT_TO });
    });
    expect(await screen.findByText(EMPTY_WEEK)).toBeTruthy();
  });
});
