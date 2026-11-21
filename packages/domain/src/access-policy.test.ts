import { CONSENT_VERSIONS, type ConsentType, type LinkStatus } from '@noexcuse/contracts';
import { describe, expect, it } from 'vitest';
import { decideClientAccess, type ClientAccessRequest } from './access-policy';
import type { ConsentRecord } from './consent';

const CLIENT_ID = 'client-1';
const COACH_ID = 'coach-1';
const OTHER_COACH_ID = 'coach-2';
const OTHER_CLIENT_ID = 'client-2';
const OUTDATED_VERSION = '2000-01-01';

const consent = (
  type: ConsentType,
  granted = true,
  version: string = CONSENT_VERSIONS[type],
  createdAt = '2026-11-01T00:00:00Z',
): ConsentRecord => ({ type, version, granted, createdAt: new Date(createdAt) });

const linkedLink = (status: LinkStatus = 'active') => ({
  coachId: COACH_ID,
  clientId: CLIENT_ID,
  status,
});

const coachActor = { id: COACH_ID, role: 'coach' as const };
const clientActor = { id: CLIENT_ID, role: 'client' as const };

const FULL_CONSENTS = [consent('coach_access'), consent('health_data')];

const request = (overrides: Partial<ClientAccessRequest> = {}): ClientAccessRequest => ({
  actor: coachActor,
  clientId: CLIENT_ID,
  link: linkedLink(),
  consents: FULL_CONSENTS,
  scope: 'health',
  ...overrides,
});

describe('decideClientAccess: client accessing own data', () => {
  it('allows profile scope', () => {
    expect(decideClientAccess(request({ actor: clientActor, link: null, consents: [], scope: 'profile' }))).toBe('allow');
  });

  it('allows health scope without any link or consent', () => {
    expect(decideClientAccess(request({ actor: clientActor, link: null, consents: [], scope: 'health' }))).toBe('allow');
  });
});

describe('decideClientAccess: coach accessing a client', () => {
  it('allows an active linked coach with coach_access for profile scope', () => {
    expect(decideClientAccess(request({ consents: [consent('coach_access')], scope: 'profile' }))).toBe('allow');
  });

  it('allows an active linked coach with coach_access and health_data for health scope', () => {
    expect(decideClientAccess(request({ scope: 'health' }))).toBe('allow');
  });

  it('allows a paused link with valid consents', () => {
    expect(decideClientAccess(request({ link: linkedLink('paused') }))).toBe('allow');
  });

  it('denies health scope without health_data', () => {
    expect(decideClientAccess(request({ consents: [consent('coach_access')], scope: 'health' }))).toBe('deny');
  });

  it('allows profile scope without health_data', () => {
    expect(decideClientAccess(request({ consents: [consent('coach_access')], scope: 'profile' }))).toBe('allow');
  });

  it('denies when coach_access is missing', () => {
    expect(decideClientAccess(request({ consents: [consent('health_data')], scope: 'profile' }))).toBe('deny');
  });

  it('denies when coach_access has been withdrawn', () => {
    const consents = [consent('coach_access'), consent('coach_access', false, undefined, '2026-11-05T00:00:00Z')];

    expect(decideClientAccess(request({ consents, scope: 'profile' }))).toBe('deny');
  });

  it('denies when coach_access is at an outdated version', () => {
    const consents = [consent('coach_access', true, OUTDATED_VERSION)];

    expect(decideClientAccess(request({ consents, scope: 'profile' }))).toBe('deny');
  });

  it('denies health scope when health_data is at an outdated version', () => {
    const consents = [consent('coach_access'), consent('health_data', true, OUTDATED_VERSION)];

    expect(decideClientAccess(request({ consents, scope: 'health' }))).toBe('deny');
  });

  it('denies when the link is ended', () => {
    expect(decideClientAccess(request({ link: linkedLink('ended') }))).toBe('deny');
  });

  it('denies when there is no link', () => {
    expect(decideClientAccess(request({ link: null }))).toBe('deny');
  });

  it('denies a foreign coach even with a link to the same client', () => {
    expect(decideClientAccess(request({ actor: { id: OTHER_COACH_ID, role: 'coach' } }))).toBe('deny');
  });

  it('denies a coach whose link points at a different client', () => {
    const link = { coachId: COACH_ID, clientId: OTHER_CLIENT_ID, status: 'active' as const };

    expect(decideClientAccess(request({ link }))).toBe('deny');
  });

  it('denies another client', () => {
    expect(decideClientAccess(request({ actor: { id: OTHER_CLIENT_ID, role: 'client' }, link: null }))).toBe('deny');
  });
});
