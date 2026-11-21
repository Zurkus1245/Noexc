import { assertNoLocalAuthInProduction } from './app.config';

describe('assertNoLocalAuthInProduction', () => {
  it('rejects the local auth mode in an EAS production profile', () => {
    expect(() =>
      assertNoLocalAuthInProduction({ EXPO_PUBLIC_AUTH_MODE: 'local', EAS_BUILD_PROFILE: 'production' }),
    ).toThrow('not allowed in production');
  });

  it('rejects the local auth mode when APP_ENV is production', () => {
    expect(() => assertNoLocalAuthInProduction({ EXPO_PUBLIC_AUTH_MODE: 'local', APP_ENV: 'production' })).toThrow();
  });

  it('allows the local auth mode in non-production profiles', () => {
    expect(() =>
      assertNoLocalAuthInProduction({ EXPO_PUBLIC_AUTH_MODE: 'local', EAS_BUILD_PROFILE: 'development' }),
    ).not.toThrow();
  });

  it('allows production builds without the local auth mode', () => {
    expect(() => assertNoLocalAuthInProduction({ EAS_BUILD_PROFILE: 'production' })).not.toThrow();
  });
});
