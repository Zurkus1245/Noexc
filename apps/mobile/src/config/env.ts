import { z } from 'zod';

// Read at call time so tests can change the auth mode; Expo inlines EXPO_PUBLIC_* at bundle time.
export const isLocalAuthMode = (): boolean => process.env.EXPO_PUBLIC_AUTH_MODE === 'local';

// Dev login talks to the local issuer only. __DEV__ is false in release bundles, so the form cannot render there.
export const isDevLoginEnabled = (): boolean => __DEV__ && isLocalAuthMode();

export const getApiBaseUrl = (): string => z.url().parse(process.env.EXPO_PUBLIC_API_URL);
