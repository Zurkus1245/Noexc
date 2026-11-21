import { fireEvent, screen } from '@testing-library/react-native';
import { CLIENT_ID, CREATED_AT, USER_ID, problem, renderWithApi, signInTestSession, stubFetch } from '../../../shared/test/api-harness';
import { ClientDetailScreen } from './ClientDetailScreen';

const mockBack = jest.fn();

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ clientId: '22222222-2222-4222-8222-222222222222' }),
  useRouter: () => ({ back: mockBack }),
}));

const NOT_AVAILABLE = 'This client is no longer available.';
const BACK_LABEL = 'Back';

describe('ClientDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signInTestSession();
  });

  it('shows the client loaded for the route id', async () => {
    const requests = stubFetch(() => ({
      body: {
        link: {
          id: USER_ID,
          coachId: USER_ID,
          clientId: CLIENT_ID,
          status: 'active',
          createdAt: CREATED_AT,
          endedAt: null,
          endedBy: null,
        },
        client: { id: CLIENT_ID, displayName: 'Anna', timezone: 'Europe/Berlin' },
      },
    }));
    await renderWithApi(<ClientDetailScreen />);

    expect(await screen.findByText('Anna')).toBeTruthy();
    expect(requests[0]?.path).toBe(`/v1/coach/clients/${CLIENT_ID}`);
  });

  it('tells the coach the client is gone on 404 and goes back', async () => {
    stubFetch(() => ({ status: 404, body: problem(404, 'NOT_FOUND') }));
    await renderWithApi(<ClientDetailScreen />);

    expect(await screen.findByText(NOT_AVAILABLE)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: BACK_LABEL }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
