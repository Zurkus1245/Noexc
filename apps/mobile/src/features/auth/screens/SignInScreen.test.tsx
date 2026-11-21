import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { ApiProvider } from '../../../shared/api/api-context';
import { SignInScreen } from './SignInScreen';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

const renderScreen = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiProvider>
        <SignInScreen />
      </ApiProvider>
    </QueryClientProvider>,
  );

const DEV_SUBJECT_LABEL = 'Dev subject';
const UNAVAILABLE_TEXT = 'Sign-in is not available in this build.';

describe('SignInScreen dev login', () => {
  const originalMode = process.env.EXPO_PUBLIC_AUTH_MODE;

  afterEach(() => {
    if (originalMode === undefined) delete process.env.EXPO_PUBLIC_AUTH_MODE;
    else process.env.EXPO_PUBLIC_AUTH_MODE = originalMode;
  });

  it('is hidden when the auth mode is not local', async () => {
    delete process.env.EXPO_PUBLIC_AUTH_MODE;
    await renderScreen();
    expect(screen.queryByLabelText(DEV_SUBJECT_LABEL)).toBeNull();
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeTruthy();
  });

  it('is shown only in local auth mode', async () => {
    process.env.EXPO_PUBLIC_AUTH_MODE = 'local';
    await renderScreen();
    expect(screen.getByLabelText(DEV_SUBJECT_LABEL)).toBeTruthy();
    expect(screen.queryByText(UNAVAILABLE_TEXT)).toBeNull();
  });

  it('is hidden in release builds even in local auth mode', async () => {
    process.env.EXPO_PUBLIC_AUTH_MODE = 'local';
    const globals = global as unknown as { __DEV__: boolean };
    const devBuild = globals.__DEV__;
    globals.__DEV__ = false;
    try {
      await renderScreen();
    } finally {
      globals.__DEV__ = devBuild;
    }
    expect(screen.queryByLabelText(DEV_SUBJECT_LABEL)).toBeNull();
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeTruthy();
  });
});
