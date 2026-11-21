import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CONSENT_VERSIONS } from '@noexcuse/contracts';
import { RedeemForm } from './RedeemForm';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

const VALID_CODE = '0123456789ABCDEFGHJKMNPQRS';
const CONSENT_LABELS = {
  tos: 'I accept the Terms of Service',
  health_data: 'I consent to processing my health data',
  coach_access: 'I allow the coach to view my data',
} as const;
const REQUIRED_BLOCK_MESSAGE = 'Accept the three required consents to continue.';
const SUBMIT_LABEL = 'Join coach';

const renderForm = (onSubmit: jest.Mock) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RedeemForm pending={false} error={undefined} onSubmit={onSubmit} />
    </QueryClientProvider>,
  );

const checkConsent = async (name: string) => {
  await fireEvent.press(screen.getByRole('checkbox', { name }));
};

describe('RedeemForm', () => {
  it('blocks submit until all three required consents are checked', async () => {
    const onSubmit = jest.fn();
    await renderForm(onSubmit);
    await fireEvent.changeText(screen.getByLabelText('Invite code'), VALID_CODE);
    await checkConsent(CONSENT_LABELS.tos);
    await checkConsent(CONSENT_LABELS.health_data);

    await fireEvent.press(screen.getByRole('button', { name: SUBMIT_LABEL }));

    await waitFor(() => expect(screen.getByText(REQUIRED_BLOCK_MESSAGE)).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits required consents at current versions and marketing as not granted by default', async () => {
    const onSubmit = jest.fn();
    await renderForm(onSubmit);
    await fireEvent.changeText(screen.getByLabelText('Invite code'), VALID_CODE);
    await checkConsent(CONSENT_LABELS.tos);
    await checkConsent(CONSENT_LABELS.health_data);
    await checkConsent(CONSENT_LABELS.coach_access);

    await fireEvent.press(screen.getByRole('button', { name: SUBMIT_LABEL }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [body] = onSubmit.mock.calls[0] ?? [];
    expect(body).toMatchObject({ code: VALID_CODE });
    expect(body.consents).toEqual(
      expect.arrayContaining([
        { type: 'tos', version: CONSENT_VERSIONS.tos, granted: true },
        { type: 'health_data', version: CONSENT_VERSIONS.health_data, granted: true },
        { type: 'coach_access', version: CONSENT_VERSIONS.coach_access, granted: true },
        { type: 'marketing', version: CONSENT_VERSIONS.marketing, granted: false },
      ]),
    );
  });
});
