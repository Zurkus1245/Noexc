import { INVITE_TTL_HOURS } from '@noexcuse/contracts';
import { describe, expect, it } from 'vitest';
import { inviteExpiresAt, inviteState, type InviteFacts } from './invite';

const CREATED_AT = new Date('2026-11-01T00:00:00.000Z');
const EXPIRES_AT = new Date('2026-11-08T00:00:00.000Z');
const ONE_MS = 1;

const invite = (overrides: Partial<InviteFacts> = {}): InviteFacts => ({
  expiresAt: EXPIRES_AT,
  usedAt: null,
  revokedAt: null,
  ...overrides,
});

describe('inviteExpiresAt', () => {
  it('adds the invite TTL to the creation time', () => {
    expect(INVITE_TTL_HOURS).toBe(168);
    expect(inviteExpiresAt(CREATED_AT)).toEqual(EXPIRES_AT);
  });
});

describe('inviteState', () => {
  const beforeExpiry = new Date(EXPIRES_AT.getTime() - ONE_MS);

  it('is valid before expiry when unused and not revoked', () => {
    expect(inviteState(invite(), beforeExpiry)).toBe('valid');
  });

  it('is expired exactly at expiresAt', () => {
    expect(inviteState(invite(), EXPIRES_AT)).toBe('expired');
  });

  it('is expired after expiresAt', () => {
    expect(inviteState(invite(), new Date(EXPIRES_AT.getTime() + ONE_MS))).toBe('expired');
  });

  it('is used when redeemed before expiry', () => {
    expect(inviteState(invite({ usedAt: CREATED_AT }), beforeExpiry)).toBe('used');
  });

  it('is revoked when revoked before expiry', () => {
    expect(inviteState(invite({ revokedAt: CREATED_AT }), beforeExpiry)).toBe('revoked');
  });

  it('prefers revoked over used', () => {
    expect(inviteState(invite({ usedAt: CREATED_AT, revokedAt: CREATED_AT }), beforeExpiry)).toBe('revoked');
  });

  it('prefers revoked over expired', () => {
    expect(inviteState(invite({ revokedAt: CREATED_AT }), EXPIRES_AT)).toBe('revoked');
  });

  it('prefers used over expired', () => {
    expect(inviteState(invite({ usedAt: CREATED_AT }), EXPIRES_AT)).toBe('used');
  });

  it('prefers revoked over used over expired together', () => {
    const everything = invite({ usedAt: CREATED_AT, revokedAt: CREATED_AT });

    expect(inviteState(everything, new Date(EXPIRES_AT.getTime() + ONE_MS))).toBe('revoked');
  });
});
