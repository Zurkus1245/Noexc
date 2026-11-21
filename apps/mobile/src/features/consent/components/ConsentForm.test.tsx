import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { CONSENT_VERSIONS } from '@noexcuse/contracts';
import { CLIENT_ID, CREATED_AT, USER_ID, renderWithApi, signInTestSession, stubFetch } from '../../../shared/test/api-harness';
import { ConsentForm } from './ConsentForm';

// Distinct, valid UUID per call so each grant carries its own Idempotency-Key.
jest.mock('expo-crypto', () => {
  let issued = 0;
  return { randomUUID: () => '00000000-0000-4000-8000-' + String(++issued).padStart(12, '0') };
});

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

const CONTINUE = 'Continue';
const TOS_LABEL = 'I accept the Terms of Service';
const HEALTH_LABEL = 'I consent to processing my health data';
const MARKETING_LABEL = 'I agree to receive marketing (optional)';

// The API echoes the stored consent: the request body plus server-assigned fields.
const storedConsent = (requestBody: unknown) => ({ ...(requestBody as object), id: CLIENT_ID, userId: USER_ID, createdAt: CREATED_AT });

const press = async (name: string) => fireEvent.press(screen.getByRole('checkbox', { name }));

describe('ConsentForm', () => {
  beforeEach(() => signInTestSession());

  it('blocks continue until the required consents are checked, then posts them at current versions', async () => {
    const requests = stubFetch(({ body }) => ({ status: 201, body: storedConsent(body) }));
    await renderWithApi(<ConsentForm role="client" />);

    const continueButton = screen.getByRole('button', { name: CONTINUE });
    expect(continueButton).toBeDisabled();
    await press(TOS_LABEL);
    expect(continueButton).toBeDisabled();
    await press(HEALTH_LABEL);
    expect(continueButton).toBeEnabled();
    await fireEvent.press(continueButton);

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests.map((request) => request.body)).toEqual([
      { type: 'tos', version: CONSENT_VERSIONS.tos, granted: true },
      { type: 'health_data', version: CONSENT_VERSIONS.health_data, granted: true },
    ]);
    expect(requests.every((request) => request.method === 'POST' && request.path === '/v1/me/consents')).toBe(true);
    expect(requests[0]?.idempotencyKey).toBeDefined();
    expect(requests[0]?.idempotencyKey).not.toBe(requests[1]?.idempotencyKey);
  });

  it('requires only the terms from a coach and sends marketing only when it is checked', async () => {
    const requests = stubFetch(({ body }) => ({ status: 201, body: storedConsent(body) }));
    await renderWithApi(<ConsentForm role="coach" />);

    expect(screen.queryByRole('checkbox', { name: HEALTH_LABEL })).toBeNull();
    await press(TOS_LABEL);
    await press(MARKETING_LABEL);
    await fireEvent.press(screen.getByRole('button', { name: CONTINUE }));

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests.map((request) => request.body)).toEqual([
      { type: 'tos', version: CONSENT_VERSIONS.tos, granted: true },
      { type: 'marketing', version: CONSENT_VERSIONS.marketing, granted: true },
    ]);
  });

  it('starts with every consent unchecked', async () => {
    await renderWithApi(<ConsentForm role="client" />);
    for (const name of [TOS_LABEL, HEALTH_LABEL, MARKETING_LABEL]) {
      expect(screen.getByRole('checkbox', { name })).not.toBeChecked();
    }
  });
});
