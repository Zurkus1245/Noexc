// Test-only API host; the real value comes from .env at build time.
process.env.EXPO_PUBLIC_API_URL = 'https://api.test';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
