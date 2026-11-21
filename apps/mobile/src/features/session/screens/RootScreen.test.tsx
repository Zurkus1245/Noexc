import * as SecureStore from 'expo-secure-store';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithApi } from '../../../shared/test/api-harness';
import { hydrateSession, useSession } from '../../../shared/session/session-store';
import { RootScreen } from './RootScreen';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return {
    Redirect: ({ href }: { href: string }) => createElement(Text, null, `redirect:${href}`),
  };
});

const RETRY_LABEL = 'Try again';
const RESTORE_FAILED = 'Could not restore your session.';

const getItemAsync = SecureStore.getItemAsync as jest.Mock;

describe('RootScreen session hydration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: null, hydration: 'loading', storedTokenNotRemoved: false });
  });

  it('shows a retry instead of a spinner when the stored session cannot be read, and the retry restores it', async () => {
    getItemAsync.mockRejectedValueOnce(new Error('keystore unavailable')).mockResolvedValueOnce(null);
    await hydrateSession();
    await renderWithApi(<RootScreen />);

    expect(screen.getByText(RESTORE_FAILED)).toBeTruthy();
    expect(screen.queryByLabelText('Loading')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: RETRY_LABEL }));

    expect(await screen.findByText('redirect:/sign-in')).toBeTruthy();
    expect(getItemAsync).toHaveBeenCalledTimes(2);
  });
});
