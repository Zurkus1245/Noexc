import { createHash, randomBytes } from 'node:crypto';
import { INVITE_CODE_LENGTH } from '@noexcuse/contracts';

export interface InviteCodeGenerator {
  generate(): string;
}

export const INVITE_CODE_GENERATOR = Symbol('INVITE_CODE_GENERATOR');

const INVITE_RANDOM_BYTES = 5;
const BITS_PER_BYTE = 8;
const BITS_PER_CHAR = 5;
const CHAR_MASK = (1n << BigInt(BITS_PER_CHAR)) - 1n;
// Base32 characters carry 5 bits each; 8 characters take exactly the 40 random bits, so no padding is needed.
const PAD_BITS = INVITE_CODE_LENGTH * BITS_PER_CHAR - INVITE_RANDOM_BYTES * BITS_PER_BYTE;
// Crockford base32: the same alphabet the contract pattern accepts.
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export class RandomInviteCodeGenerator implements InviteCodeGenerator {
  generate(): string {
    const random = BigInt(`0x${randomBytes(INVITE_RANDOM_BYTES).toString('hex')}`);
    const value = random << BigInt(PAD_BITS);
    let code = '';
    for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
      const shift = BigInt((INVITE_CODE_LENGTH - 1 - index) * BITS_PER_CHAR);
      code += CROCKFORD_ALPHABET.charAt(Number((value >> shift) & CHAR_MASK));
    }
    return code;
  }
}

// Only the hash is stored: a leaked database must not yield usable invite codes.
export const hashInviteCode = (code: string): string => createHash('sha256').update(code).digest('hex');
