import { CONSENT_VERSIONS, type ConsentType } from '@noexcuse/contracts';
import { describe, expect, it } from 'vitest';
import {
  currentConsents,
  hasValidConsent,
  missingRequiredForRedeem,
  type ConsentRecord,
  type ConsentEntry,
} from './consent';

const OUTDATED_VERSION = '2000-01-01';

const consent = (
  type: ConsentType,
  granted: boolean,
  createdAt: string,
  version: string = CONSENT_VERSIONS[type],
): ConsentRecord => ({ type, version, granted, createdAt: new Date(createdAt) });

const entry = (type: ConsentType, granted = true, version: string = CONSENT_VERSIONS[type]): ConsentEntry => ({
  type,
  version,
  granted,
});

describe('currentConsents', () => {
  it('returns an empty map for no records', () => {
    expect(currentConsents([]).size).toBe(0);
  });

  it('picks the latest record per type by createdAt regardless of array order', () => {
    const newer = consent('tos', false, '2026-11-10T00:00:00Z');
    const older = consent('tos', true, '2026-11-01T00:00:00Z');

    expect(currentConsents([newer, older]).get('tos')).toBe(newer);
    expect(currentConsents([older, newer]).get('tos')).toBe(newer);
  });

  it('resolves equal timestamps to the later array entry', () => {
    const first = consent('tos', true, '2026-11-01T00:00:00Z');
    const second = consent('tos', false, '2026-11-01T00:00:00Z');

    expect(currentConsents([first, second]).get('tos')).toBe(second);
  });

  it('tracks each consent type independently', () => {
    const tos = consent('tos', true, '2026-11-01T00:00:00Z');
    const marketing = consent('marketing', false, '2026-11-02T00:00:00Z');

    const current = currentConsents([tos, marketing]);

    expect(current.get('tos')).toBe(tos);
    expect(current.get('marketing')).toBe(marketing);
    expect(current.has('health_data')).toBe(false);
  });
});

describe('hasValidConsent', () => {
  const T = '2026-11-01T00:00:00Z';

  it('is false when no record exists for the type', () => {
    expect(hasValidConsent([], 'coach_access')).toBe(false);
  });

  it('is true when the latest record is granted at the current version', () => {
    expect(hasValidConsent([consent('coach_access', true, T)], 'coach_access')).toBe(true);
  });

  it('is false when the latest record withdraws an earlier grant', () => {
    const records = [consent('coach_access', true, T), consent('coach_access', false, '2026-11-05T00:00:00Z')];

    expect(hasValidConsent(records, 'coach_access')).toBe(false);
  });

  it('is true when consent is granted again after a withdrawal', () => {
    const records = [
      consent('coach_access', false, T),
      consent('coach_access', true, '2026-11-05T00:00:00Z'),
    ];

    expect(hasValidConsent(records, 'coach_access')).toBe(true);
  });

  it('is false when the latest granted record has an outdated version', () => {
    const records = [consent('health_data', true, T, OUTDATED_VERSION)];

    expect(hasValidConsent(records, 'health_data')).toBe(false);
  });

  it('is false when a newer outdated grant supersedes an older current grant', () => {
    const records = [
      consent('health_data', true, T),
      consent('health_data', true, '2026-11-05T00:00:00Z', OUTDATED_VERSION),
    ];

    expect(hasValidConsent(records, 'health_data')).toBe(false);
  });

  it('ignores grants of other types', () => {
    expect(hasValidConsent([consent('tos', true, T)], 'coach_access')).toBe(false);
  });
});

describe('missingRequiredForRedeem', () => {
  it('returns nothing when tos, health_data and coach_access are granted at current versions', () => {
    const request = [entry('tos'), entry('health_data'), entry('coach_access')];

    expect(missingRequiredForRedeem(request)).toEqual([]);
  });

  it('does not require marketing', () => {
    const request = [entry('tos'), entry('health_data'), entry('coach_access')];

    expect(missingRequiredForRedeem(request)).not.toContain('marketing');
  });

  it('reports every required type when the request is empty, in a stable order', () => {
    expect(missingRequiredForRedeem([])).toEqual(['tos', 'health_data', 'coach_access']);
  });

  it('reports a required type that is not granted', () => {
    const request = [entry('tos'), entry('health_data', false), entry('coach_access')];

    expect(missingRequiredForRedeem(request)).toEqual(['health_data']);
  });

  it('reports a required type granted at an outdated version', () => {
    const request = [entry('tos'), entry('health_data'), entry('coach_access', true, OUTDATED_VERSION)];

    expect(missingRequiredForRedeem(request)).toEqual(['coach_access']);
  });

  it('rejects a contradictory request that both refuses and grants a required type', () => {
    const request = [entry('tos', false), entry('tos'), entry('health_data'), entry('coach_access')];

    expect(missingRequiredForRedeem(request)).toEqual(['tos']);
  });
});
