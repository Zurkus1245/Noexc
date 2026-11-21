import { createHash } from 'node:crypto';
import { INVITE_CODE_LENGTH, InviteCodeSchema } from '@noexcuse/contracts';
import { describe, expect, it } from 'vitest';
import { RandomInviteCodeGenerator, hashInviteCode } from './invite-code';

const SAMPLES = 1000;

describe('RandomInviteCodeGenerator', () => {
  const generator = new RandomInviteCodeGenerator();

  it('produces codes the contract accepts, of the contract length', () => {
    const code = generator.generate();

    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect(InviteCodeSchema.parse(code)).toBe(code);
  });

  it('does not repeat across samples', () => {
    const codes = new Set(Array.from({ length: SAMPLES }, () => generator.generate()));

    expect(codes.size).toBe(SAMPLES);
  });
});

describe('hashInviteCode', () => {
  it('stores the sha256 hex digest, never the code itself', () => {
    const code = '0123456789ABCDEFGHJKMNPQRS';

    expect(hashInviteCode(code)).toBe(createHash('sha256').update(code).digest('hex'));
    expect(hashInviteCode(code)).toHaveLength(64);
  });
});
