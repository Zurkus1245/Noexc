import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { CLIENT_ID, CREATED_AT, problem, renderWithApi, signInTestSession, stubFetch } from '../../../shared/test/api-harness';
import { PlanScreen } from './PlanScreen';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => IDEMPOTENCY_KEY }));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ clientId: '22222222-2222-4222-8222-222222222222' }),
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
}));

const IDEMPOTENCY_KEY = '77777777-7777-4777-8777-777777777777';
const BLOCK_KEY = '33333333-3333-4333-8333-333333333333';
const WORKOUT_KEY = '44444444-4444-4444-8444-444444444444';
const EXERCISE_KEY = '55555555-5555-4555-8555-555555555555';
const PLAN_VERSION = 3;
const PLAN_PATH = `/v1/coach/clients/${CLIENT_ID}/plan`;
const VERSION_CONFLICT_MESSAGE = 'The plan was changed meanwhile. Reload it and try again.';
const SAVE_LABEL = 'Save plan';
const BLOCK_TITLE_LABEL = 'Block title';

// Save enables once the edit reaches the form state, so a press is only sent after that settles.
const editBlockTitle = async (title: string) => {
  fireEvent.changeText(screen.getByLabelText(BLOCK_TITLE_LABEL), title);
  await waitFor(() => expect(screen.getByRole('button', { name: SAVE_LABEL })).toBeEnabled());
};

const plan = (version: number, blockTitle = 'Base') => ({
  linkId: '11111111-1111-4111-8111-111111111111',
  clientId: CLIENT_ID,
  version,
  updatedAt: CREATED_AT,
  content: {
    blocks: [
      {
        key: BLOCK_KEY,
        title: blockTitle,
        workouts: [
          {
            key: WORKOUT_KEY,
            title: 'Squat day',
            exercises: [
              { key: EXERCISE_KEY, name: 'Squat', sets: 3, repsMin: 5, repsMax: 5, weightKg: 100, restSec: 120, note: null },
            ],
          },
        ],
      },
    ],
  },
});

describe('PlanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signInTestSession();
  });

  it('saves with baseVersion equal to the loaded version', async () => {
    const requests = stubFetch((request) =>
      request.method === 'PUT' ? { body: plan(PLAN_VERSION + 1) } : { body: plan(PLAN_VERSION) },
    );
    await renderWithApi(<PlanScreen />);

    await screen.findByText('Version 3');
    await editBlockTitle('Base 2');
    fireEvent.press(screen.getByRole('button', { name: SAVE_LABEL }));

    await waitFor(() => expect(requests.some((request) => request.method === 'PUT')).toBe(true));
    const put = requests.find((request) => request.method === 'PUT');
    expect(put?.path).toBe(PLAN_PATH);
    expect(put?.body).toMatchObject({ baseVersion: PLAN_VERSION });
    expect(put?.idempotencyKey).toBe(IDEMPOTENCY_KEY);
  });

  it('keeps Save disabled while the form is unchanged', async () => {
    stubFetch(() => ({ body: plan(PLAN_VERSION) }));
    await renderWithApi(<PlanScreen />);

    await screen.findByText('Version 3');
    expect(screen.getByRole('button', { name: SAVE_LABEL })).toBeDisabled();
  });

  it('shows the saved version, disables Save and offers assignment after a successful save', async () => {
    stubFetch((request) =>
      request.method === 'PUT' ? { body: plan(PLAN_VERSION + 1, 'Base 2') } : { body: plan(PLAN_VERSION) },
    );
    await renderWithApi(<PlanScreen />);

    await screen.findByText('Version 3');
    await editBlockTitle('Base 2');
    fireEvent.press(screen.getByRole('button', { name: SAVE_LABEL }));

    expect(await screen.findByText('Saved · version 4')).toBeTruthy();
    expect(screen.getByRole('button', { name: SAVE_LABEL })).toBeDisabled();

    fireEvent.press(screen.getByRole('button', { name: 'Assign to calendar' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/clients/[clientId]/calendar',
      params: { clientId: CLIENT_ID },
    });
  });

  it('shows the check-fields banner and no request when validation fails', async () => {
    const requests = stubFetch(() => ({ body: plan(PLAN_VERSION) }));
    await renderWithApi(<PlanScreen />);

    await screen.findByText('Version 3');
    await editBlockTitle('   ');
    fireEvent.press(screen.getByRole('button', { name: SAVE_LABEL }));

    expect(await screen.findByText('Check highlighted fields')).toBeTruthy();
    expect(requests.some((request) => request.method === 'PUT')).toBe(false);
  });

  it('shows the conflict message and reloads the plan on VERSION_CONFLICT', async () => {
    const requests = stubFetch((request) =>
      request.method === 'PUT' ? { status: 409, body: problem(409, 'VERSION_CONFLICT') } : { body: plan(PLAN_VERSION) },
    );
    await renderWithApi(<PlanScreen />);

    await screen.findByText('Version 3');
    await editBlockTitle('Base 2');
    fireEvent.press(screen.getByRole('button', { name: SAVE_LABEL }));

    expect(await screen.findByText(VERSION_CONFLICT_MESSAGE)).toBeTruthy();
    const getsBefore = requests.filter((request) => request.method === 'GET' && request.path === PLAN_PATH).length;
    fireEvent.press(screen.getByRole('button', { name: 'Reload plan' }));

    await waitFor(() =>
      expect(requests.filter((request) => request.method === 'GET' && request.path === PLAN_PATH).length).toBe(
        getsBefore + 1,
      ),
    );
  });
});
