import { ApiError, type ApiErrorCode } from '@noexcuse/api-client';
import { ERROR_CODES } from '@noexcuse/contracts';
import { render, screen } from '@testing-library/react-native';
import { ApiErrorBanner } from '../components/ApiErrorBanner';
import { en } from '../i18n/en';
import { ru } from '../i18n/ru';
import { presentError } from './api-error';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

const RAW_SERVER_TEXT = 'SQL constraint violation on invites.code_hash';

const apiError = (code: ApiErrorCode) =>
  new ApiError({ code, status: 400, requestId: 'req-1', detail: RAW_SERVER_TEXT });

describe('presentError', () => {
  it.each(ERROR_CODES)('maps %s to a key present in both dictionaries', (code) => {
    const { messageKey } = presentError(apiError(code));
    expect(en[messageKey]).toBeDefined();
    expect(ru[messageKey]).toBeDefined();
  });

  it('maps an unknown server code to the generic message', () => {
    expect(presentError(apiError('unknown')).messageKey).toBe('error.INTERNAL');
  });

  it('maps a non-API failure to the generic message without retry', () => {
    expect(presentError(new TypeError('boom'))).toEqual({ messageKey: 'error.INTERNAL', retryable: false });
  });

  it('marks network failures retryable and business rejections not retryable', () => {
    expect(presentError(apiError('NETWORK_ERROR')).retryable).toBe(true);
    expect(presentError(apiError('LINK_EXISTS')).retryable).toBe(false);
  });
});

describe('ApiErrorBanner', () => {
  it('shows the localized text, never the raw server detail', async () => {
    await render(<ApiErrorBanner error={apiError('LINK_EXISTS')} />);
    expect(screen.getByText(en['error.LINK_EXISTS'])).toBeTruthy();
    expect(screen.queryByText(RAW_SERVER_TEXT)).toBeNull();
  });

  it('offers retry for network failures', async () => {
    await render(<ApiErrorBanner error={apiError('NETWORK_ERROR')} onRetry={jest.fn()} />);
    expect(screen.getByRole('button', { name: en['common.retry'] })).toBeTruthy();
  });

  it('does not offer retry for rejected requests', async () => {
    await render(<ApiErrorBanner error={apiError('LINK_EXISTS')} onRetry={jest.fn()} />);
    expect(screen.queryByRole('button', { name: en['common.retry'] })).toBeNull();
  });
});
