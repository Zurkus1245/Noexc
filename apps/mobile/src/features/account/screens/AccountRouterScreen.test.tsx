import { screen } from '@testing-library/react-native';
import { CONSENT_VERSIONS } from '@noexcuse/contracts';
import { CREATED_AT, USER_ID, renderWithApi, signInTestSession, stubFetch } from '../../../shared/test/api-harness';
import { AccountRouterScreen } from './AccountRouterScreen';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Europe/Berlin' }],
}));

// Redirect becomes visible text so each test can assert the route it chose.
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return {
    Redirect: ({ href }: { href: string }) => createElement(Text, null, `redirect:${href}`),
  };
});

const OUTDATED_VERSION = '2026-01-01';

const CONSENT_ID = '33333333-3333-4333-8333-333333333333';

const consent = (type: string, version: string, granted = true) => ({
  id: CONSENT_ID,
  userId: USER_ID,
  type,
  version,
  granted,
  createdAt: CREATED_AT,
});

const currentTos = () => consent('tos', CONSENT_VERSIONS.tos);
const currentHealth = () => consent('health_data', CONSENT_VERSIONS.health_data);

const stubAccount = (role: 'coach' | 'client', consents: unknown[]) =>
  stubFetch(({ method, path }) => {
    if (method === 'GET' && path === '/v1/me') {
      return { body: { id: USER_ID, role, displayName: 'Test', timezone: 'Europe/Berlin', createdAt: CREATED_AT } };
    }
    if (method === 'GET' && path === '/v1/me/consents') return { body: consents };
    return { status: 500, body: {} };
  });

describe('AccountRouterScreen consent gate', () => {
  beforeEach(() => signInTestSession());

  it('sends a client without any consent to the consent screen', async () => {
    stubAccount('client', []);
    await renderWithApi(<AccountRouterScreen />);
    expect(await screen.findByText('redirect:/consent')).toBeTruthy();
  });

  it('sends a user whose terms were accepted at an outdated version to the consent screen', async () => {
    stubAccount('coach', [consent('tos', OUTDATED_VERSION)]);
    await renderWithApi(<AccountRouterScreen />);
    expect(await screen.findByText('redirect:/consent')).toBeTruthy();
  });

  it('sends a client missing health data consent to the consent screen', async () => {
    stubAccount('client', [currentTos()]);
    await renderWithApi(<AccountRouterScreen />);
    expect(await screen.findByText('redirect:/consent')).toBeTruthy();
  });

  it('routes a client with current mandatory consents to the client home', async () => {
    stubAccount('client', [currentTos(), currentHealth()]);
    await renderWithApi(<AccountRouterScreen />);
    expect(await screen.findByText('redirect:/links')).toBeTruthy();
  });

  it('routes a coach with current terms to the coach home', async () => {
    stubAccount('coach', [currentTos()]);
    await renderWithApi(<AccountRouterScreen />);
    expect(await screen.findByText('redirect:/clients')).toBeTruthy();
  });
});
