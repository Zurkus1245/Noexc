import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { CLIENT_ID, CREATED_AT, USER_ID, problem, renderWithApi, signInTestSession, stubFetch } from '../../../shared/test/api-harness';
import { WorkoutPicker } from './WorkoutPicker';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

// Each call yields a distinct valid UUID, so tests can tell fresh ids from reused ones.
jest.mock('expo-crypto', () => {
  let counter = 0;
  return {
    randomUUID: () => {
      counter += 1;
      return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
    },
  };
});

const DATE = '2026-11-18';
const PLAN_PATH = `/v1/coach/clients/${CLIENT_ID}/plan`;
const CALENDAR_PATH = `/v1/coach/clients/${CLIENT_ID}/calendar`;
const FIRST_LABEL = 'Base · Squat day';
const SECOND_LABEL = 'Base · Bench day';

const exercise = (key: string) => ({
  key,
  name: 'Lift',
  sets: 3,
  repsMin: 5,
  repsMax: 5,
  weightKg: null,
  restSec: null,
  note: null,
});

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
          { key: '44444444-4444-4444-8444-444444444444', title: 'Squat day', exercises: [exercise('55555555-5555-4555-8555-555555555555')] },
          { key: '66666666-6666-4666-8666-666666666666', title: 'Bench day', exercises: [exercise('77777777-7777-4777-8777-777777777777')] },
        ],
      },
    ],
  },
};

const renderPicker = () => renderWithApi(<WorkoutPicker clientId={CLIENT_ID} date={DATE} onDone={jest.fn()} />);

describe('WorkoutPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signInTestSession();
  });

  it('reuses the entry id when the same workout is retried and issues a new id for another workout', async () => {
    let failNextCreate = true;
    const requests = stubFetch((request) => {
      if (request.path === PLAN_PATH) return { body: plan };
      if (request.path === CALENDAR_PATH && failNextCreate) {
        failNextCreate = false;
        return { status: 503, body: problem(503, 'unavailable') };
      }
      return { status: 201, body: {} };
    });
    await renderPicker();

    fireEvent.press(await screen.findByRole('button', { name: FIRST_LABEL }));
    expect(await screen.findByText('Something went wrong. Try again.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: FIRST_LABEL }));
    await waitFor(() => expect(requests.filter((request) => request.method === 'POST')).toHaveLength(2));
    fireEvent.press(screen.getByRole('button', { name: SECOND_LABEL }));
    await waitFor(() => expect(requests.filter((request) => request.method === 'POST')).toHaveLength(3));

    const [first, retry, other] = requests.filter((request) => request.method === 'POST');
    expect((retry?.body as { id: string }).id).toBe((first?.body as { id: string }).id);
    expect((other?.body as { id: string }).id).not.toBe((first?.body as { id: string }).id);
    expect((other?.body as { workoutKey: string }).workoutKey).toBe(plan.content.blocks[0]?.workouts[1]?.key);
  });
});
