import { Alert, type AlertButton } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { CONSENT_VERSIONS } from '@noexcuse/contracts';
import {
  CREATED_AT,
  USER_ID,
  renderWithApi,
  signInTestSession,
  stubFetch,
  type RecordedRequest,
} from '../../../shared/test/api-harness';
import { ConsentSettings } from './ConsentSettings';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

const COACH_ACCESS_LABEL = 'I allow the coach to view my data';
const MARKETING_LABEL = 'I agree to receive marketing (optional)';
const CONSENT_ID = '33333333-3333-4333-8333-333333333333';

const coachAccessGranted = {
  id: CONSENT_ID,
  userId: USER_ID,
  type: 'coach_access',
  version: CONSENT_VERSIONS.coach_access,
  granted: true,
  createdAt: CREATED_AT,
};

// Lists the current consents and echoes each grant as stored.
;

const postsOf = (requests: RecordedRequest[]) => requests.filter((request) => request.method === 'POST');

const consentApi = ({ method, body }: RecordedRequest) =>
  method === 'GET'
    ? { body: [coachAccessGranted] }
    : { status: 201, body: { ...(body as object), id: CONSENT_ID, userId: USER_ID, createdAt: CREATED_AT } };

describe('ConsentSettings', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    signInTestSession();
  });

  it('asks for confirmation before withdrawing coach access, and withdraws only after confirming', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const requests = stubFetch(consentApi);
    await renderWithApi(<ConsentSettings role="client" />);

    await fireEvent.press(await screen.findByRole('checkbox', { name: COACH_ACCESS_LABEL }));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(postsOf(requests)).toHaveLength(0);

    const buttons = alert.mock.calls[0]?.[2] as AlertButton[];
    buttons.find((button) => button.style === 'destructive')?.onPress?.();

    await waitFor(() => expect(postsOf(requests)).toHaveLength(1));
    expect(postsOf(requests).at(-1)?.body).toEqual({ type: 'coach_access', version: CONSENT_VERSIONS.coach_access, granted: false });
  });

  it('grants marketing directly without a confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const requests = stubFetch(consentApi);
    await renderWithApi(<ConsentSettings role="coach" />);

    await fireEvent.press(await screen.findByRole('checkbox', { name: MARKETING_LABEL }));

    await waitFor(() => expect(postsOf(requests)).toHaveLength(1));
    expect(alert).not.toHaveBeenCalled();
    expect(postsOf(requests).at(-1)?.body).toEqual({ type: 'marketing', version: CONSENT_VERSIONS.marketing, granted: true });
  });
});
