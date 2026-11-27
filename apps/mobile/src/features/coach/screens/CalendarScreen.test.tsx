import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { todayInTimeZone } from '@noexcuse/domain';
import { CLIENT_ID, CREATED_AT, USER_ID, renderWithApi, signInTestSession, stubFetch } from '../../../shared/test/api-harness';
import { startOfWeek } from '../../../shared/week';
import { CalendarScreen } from './CalendarScreen';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => ENTRY_ID }));

jest.mock('expo-router', () => ({
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({ clientId: '22222222-2222-4222-8222-222222222222' }),
  useRouter: () => ({ back: jest.fn() }),
}));

const TIMEZONE = 'Europe/Berlin';
const ENTRY_ID = '66666666-6666-4666-8666-666666666666';
const WORKOUT_KEY = '44444444-4444-4444-8444-444444444444';
const BASE_PATH = `/v1/coach/clients/${CLIENT_ID}`;

const client = {
  link: {
    id: USER_ID,
    coachId: USER_ID,
    clientId: CLIENT_ID,
    status: 'active',
    createdAt: CREATED_AT,
    endedAt: null,
    endedBy: null,
  },
  client: { id: CLIENT_ID, displayName: 'Anna', timezone: TIMEZONE },
};

const plan = {
  linkId: USER_ID,
  clientId: CLIENT_ID,
  version: 1,
  updatedAt: CREATED_AT,
  content: {
    blocks: [
      {
        key: '33333333-3333-4333-8333-333333333333',
        title: 'Base',
        workouts: [
          {
            key: WORKOUT_KEY,
            title: 'Squat day',
            exercises: [
              {
                key: '55555555-5555-4555-8555-555555555555',
                name: 'Squat',
                sets: 3,
                repsMin: 5,
                repsMax: 5,
                weightKg: null,
                restSec: null,
                note: null,
              },
            ],
          },
        ],
      },
    ],
  },
};

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signInTestSession();
  });

  it('assigns a plan workout to a day with createCalendarEntry', async () => {
    const requests = stubFetch((request) => {
      if (request.method === 'POST') {
        return {
          status: 201,
          body: {
            id: (request.body as { id: string }).id,
            linkId: USER_ID,
            clientId: CLIENT_ID,
            coachId: USER_ID,
            date: (request.body as { date: string }).date,
            workoutKey: WORKOUT_KEY,
            blockTitle: 'Base',
            workout: plan.content.blocks[0]?.workouts[0],
          },
        };
      }
      if (request.path === `${BASE_PATH}/plan`) return { body: plan };
      if (request.path === `${BASE_PATH}/calendar`) return { body: { items: [] } };
      return { body: client };
    });
    await renderWithApi(<CalendarScreen />);

    // The first assign button belongs to the Monday of the client's current week.
    const monday = startOfWeek(todayInTimeZone(TIMEZONE, new Date()));
    const [firstAssign] = await screen.findAllByRole('button', { name: 'Assign workout' });
    if (firstAssign === undefined) throw new Error('No assign button rendered');
    fireEvent.press(firstAssign);
    fireEvent.press(await screen.findByRole('button', { name: 'Base · Squat day' }));

    await waitFor(() => expect(requests.some((request) => request.method === 'POST')).toBe(true));
    const post = requests.find((request) => request.method === 'POST');
    expect(post?.path).toBe(`${BASE_PATH}/calendar`);
    expect(post?.body).toEqual({ id: ENTRY_ID, date: monday, workoutKey: WORKOUT_KEY });
    expect(post?.idempotencyKey).toEqual(expect.any(String));
  });
});
