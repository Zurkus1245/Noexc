import { describe, expect, it } from 'vitest';
import { CONSENT_TYPES, CONSENT_VERSION_MAX_LENGTH, CONSENT_VERSIONS, REQUIRED_CONSENT_TYPES } from './consent';
import {
  formatInviteCode,
  INVITE_CODE_LENGTH,
  InviteCodeSchema,
  RedeemInviteBodySchema,
  RedeemInviteRequestSchema,
} from './invite';

const VALID_CODE = '7K2QM9XA';

const requiredConsents = REQUIRED_CONSENT_TYPES.map((type) => ({
  type,
  version: CONSENT_VERSIONS[type],
  granted: true,
}));

describe('InviteCodeSchema', () => {
  it('accepts an 8-character Crockford base32 code', () => {
    expect(VALID_CODE).toHaveLength(INVITE_CODE_LENGTH);
    expect(InviteCodeSchema.parse(VALID_CODE)).toBe(VALID_CODE);
  });

  it('normalizes lowercase input to uppercase', () => {
    expect(InviteCodeSchema.parse(VALID_CODE.toLowerCase())).toBe(VALID_CODE);
  });

  it.each([
    ['the grouped display form', formatInviteCode(VALID_CODE)],
    ['spaces and dashes', ` ${VALID_CODE.slice(0, 2)} ${VALID_CODE.slice(2, 5)}-${VALID_CODE.slice(5)} `],
  ])('accepts %s', (_label, typed) => {
    expect(InviteCodeSchema.parse(typed)).toBe(VALID_CODE);
  });

  it('reads the Crockford look-alikes O as 0 and I or L as 1', () => {
    expect(InviteCodeSchema.parse('O1IL2345')).toBe('01112345');
  });

  it('groups the display form in two halves', () => {
    expect(formatInviteCode(VALID_CODE)).toBe('7K2Q-M9XA');
  });

  it.each([
    ['too short', VALID_CODE.slice(1)],
    ['too long', `${VALID_CODE}0`],
    ['excluded letter U', `U${VALID_CODE.slice(1)}`],
    ['non-alphabet symbol', `*${VALID_CODE.slice(1)}`],
  ])('rejects %s', (_label, code) => {
    expect(InviteCodeSchema.safeParse(code).success).toBe(false);
  });
});

describe('RedeemInviteRequestSchema', () => {
  it('accepts required consents granted at current versions without marketing', () => {
    expect(RedeemInviteRequestSchema.safeParse({ code: VALID_CODE, consents: requiredConsents }).success).toBe(true);
  });

  it.each(REQUIRED_CONSENT_TYPES)('rejects when %s is missing', (missingType) => {
    const consents = requiredConsents.filter((consent) => consent.type !== missingType);
    expect(RedeemInviteRequestSchema.safeParse({ code: VALID_CODE, consents }).success).toBe(false);
  });

  it('rejects a required consent that is not granted', () => {
    const consents = requiredConsents.map((consent) =>
      consent.type === 'tos' ? { ...consent, granted: false } : consent,
    );
    expect(RedeemInviteRequestSchema.safeParse({ code: VALID_CODE, consents }).success).toBe(false);
  });

  it('rejects a required consent given to an outdated version', () => {
    const consents = requiredConsents.map((consent) =>
      consent.type === 'health_data' ? { ...consent, version: '2020-01-01' } : consent,
    );
    expect(RedeemInviteRequestSchema.safeParse({ code: VALID_CODE, consents }).success).toBe(false);
  });
});

describe('RedeemInviteBodySchema', () => {
  it('accepts a structurally valid body even when required consents are missing', () => {
    expect(RedeemInviteBodySchema.safeParse({ code: VALID_CODE, consents: [] }).success).toBe(true);
  });

  it('still rejects a malformed code and a version longer than the stored column', () => {
    expect(RedeemInviteBodySchema.safeParse({ code: 'short', consents: [] }).success).toBe(false);
    expect(
      RedeemInviteBodySchema.safeParse({
        code: VALID_CODE,
        consents: [{ type: 'tos', version: 'x'.repeat(CONSENT_VERSION_MAX_LENGTH + 1), granted: true }],
      }).success,
    ).toBe(false);
  });

  it('caps the consent list at one entry per consent type', () => {
    const consents = Array.from({ length: CONSENT_TYPES.length + 1 }, () => ({
      type: 'tos',
      version: CONSENT_VERSIONS.tos,
      granted: true,
    }));

    expect(RedeemInviteBodySchema.safeParse({ code: VALID_CODE, consents }).success).toBe(false);
  });
});
