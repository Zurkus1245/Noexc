import type { ConfigContext, ExpoConfig } from 'expo/config';

const REQUIRED_PUBLIC_ENV = 'EXPO_PUBLIC_API_URL';
const PRODUCTION_PROFILE = 'production';

// Fail at build time when the API host is missing; the app reads the same variable at runtime.
const requireApiUrl = (env: Readonly<Record<string, string | undefined>>): string => {
  const value = env[REQUIRED_PUBLIC_ENV];
  if (value === undefined || value === '') {
    throw new Error(`${REQUIRED_PUBLIC_ENV} must be set (see .env.example)`);
  }
  return value;
};

// The local issuer must never ship: a production build with the dev-login mode fails before bundling.
export const assertNoLocalAuthInProduction = (env: Readonly<Record<string, string | undefined>>): void => {
  const isLocalAuth = env.EXPO_PUBLIC_AUTH_MODE === 'local';
  const isProduction = env.EAS_BUILD_PROFILE === PRODUCTION_PROFILE || env.APP_ENV === PRODUCTION_PROFILE;
  if (isLocalAuth && isProduction) {
    throw new Error('EXPO_PUBLIC_AUTH_MODE=local is not allowed in production builds');
  }
};

export default ({ config }: ConfigContext): ExpoConfig => {
  requireApiUrl(process.env);
  assertNoLocalAuthInProduction(process.env);
  return {
    ...config,
    name: 'NoExcuse',
    slug: 'noexcuse',
    scheme: 'noexcuse',
    version: '0.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    ios: { bundleIdentifier: 'app.noexcuse.mobile', supportsTablet: false },
    android: { package: 'app.noexcuse.mobile' },
    plugins: ['expo-router', 'expo-secure-store', 'expo-localization'],
  };
};
