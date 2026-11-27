import { fireEvent, screen } from '@testing-library/react-native';
import { CLIENT_ID, problem, renderWithApi, signInTestSession, stubFetch, type RecordedRequest } from '../../../shared/test/api-harness';
import { PlanScreen } from './PlanScreen';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

jest.mock('expo-router', () => ({
  useFocusEffect: () => undefined,
}));

const PLANS_PATH = '/v1/client/plans';
const LINKS_PATH = '/v1/client/links';
const LINK_ID = '66666666-6666-4666-8666-666666666666';
const COACH_ID = '77777777-7777-4777-8777-777777777777';
const WORKOUT_KEY = '44444444-4444-4444-8444-444444444444';
const BLOCK_KEY = '88888888-8888-4888-8888-888888888888';
const EXERCISE_KEY = '55555555-5555-4555-8555-555555555555';
const BLOCK_TITLE = 'Strength block';
const WORKOUT_TITLE = 'Leg day';
const EXERCISE_NAME = 'Back squat';
const COACH_NAME = 'Coach Ben';
const EMPTY_PLAN = 'Your coach has not created a plan yet.';
const WITH_COACH_TITLE = 'Coach Ben · Plan · version 2';
const PLAIN_TITLE = 'Plan · version 2';

const plan = {
  linkId: LINK_ID,
  clientId: CLIENT_ID,
  version: 2,
  content: {
    blocks: [
      {
        key: BLOCK_KEY,
        title: BLOCK_TITLE,
        workouts: [
          {
            key: WORKOUT_KEY,
            title: WORKOUT_TITLE,
            exercises: [
              { key: EXERCISE_KEY, name: EXERCISE_NAME, sets: 3, repsMin: 5, repsMax: 8, weightKg: 100, restSec: 180, note: null },
            ],
          },
        ],
      },
    ],
  },
  updatedAt: '2026-11-18T10:00:00.000Z',
};

const link = {
  id: LINK_ID,
  coachId: COACH_ID,
  coachDisplayName: COACH_NAME,
  status: 'active',
  createdAt: '2026-11-02T10:00:00.000Z',
};

const planHandler = (plans: unknown[], links: unknown[] = []) => (request: RecordedRequest) => {
  if (request.path === PLANS_PATH) return { body: { items: plans } };
  if (request.path === LINKS_PATH) return { body: { items: links, nextCursor: null } };
  return { status: 404, body: problem(404, 'NOT_FOUND') };
};

describe('PlanScreen', () => {
  beforeEach(() => {
    signInTestSession();
  });

  it('renders blocks and collapsed workouts, and expands exercises on tap', async () => {
    stubFetch(planHandler([plan], [link]));
    await renderWithApi(<PlanScreen />);

    expect(await screen.findByText(WITH_COACH_TITLE)).toBeTruthy();
    expect(screen.getByText(BLOCK_TITLE)).toBeTruthy();
    expect(screen.getByText(WORKOUT_TITLE)).toBeTruthy();
    expect(screen.queryByText(EXERCISE_NAME)).toBeNull();

    await fireEvent.press(screen.getByText(WORKOUT_TITLE));

    expect(screen.getByText(EXERCISE_NAME)).toBeTruthy();
    expect(screen.getByText('3 sets × 5–8 reps')).toBeTruthy();
    expect(screen.getByText('100 kg · 180 s rest')).toBeTruthy();
  });

  it('falls back to the plan title when the coach name is unavailable', async () => {
    stubFetch(planHandler([plan]));
    await renderWithApi(<PlanScreen />);

    expect(await screen.findByText(PLAIN_TITLE)).toBeTruthy();
  });

  it('shows the empty state when there are no plans', async () => {
    stubFetch(planHandler([]));
    await renderWithApi(<PlanScreen />);

    expect(await screen.findByText(EMPTY_PLAN)).toBeTruthy();
  });

  it('shows the empty state for a plan without blocks', async () => {
    stubFetch(planHandler([{ ...plan, version: 0, content: { blocks: [] }, updatedAt: null }]));
    await renderWithApi(<PlanScreen />);

    expect(await screen.findByText(EMPTY_PLAN)).toBeTruthy();
  });

  it('shows the localized error banner when the plans request fails', async () => {
    stubFetch(() => ({ status: 500, body: problem(500, 'INTERNAL') }));
    await renderWithApi(<PlanScreen />);

    expect(await screen.findByText('Something went wrong. Try again.')).toBeTruthy();
    expect(screen.queryByText(EMPTY_PLAN)).toBeNull();
  });
});
