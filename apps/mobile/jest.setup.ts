import { configure } from '@testing-library/react-native';

// Test-only API host; the real value comes from .env at build time.
process.env.EXPO_PUBLIC_API_URL = 'https://api.test';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

// Suites run in parallel workers; the 1s default is shorter than a loaded worker needs to render a list.
const ASYNC_UTIL_TIMEOUT_MS = 5000;
configure({ asyncUtilTimeout: ASYNC_UTIL_TIMEOUT_MS });
