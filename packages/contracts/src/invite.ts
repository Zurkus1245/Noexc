import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common';
import {
  CONSENT_TYPES,
  CONSENT_VERSION_MAX_LENGTH,
  CONSENT_VERSIONS,
  ConsentTypeSchema,
  GrantConsentRequestSchema,
  REQUIRED_CONSENT_TYPES,
} from './consent';

export const INVITE_TTL_HOURS = 168;
// 8 Crockford base32 characters = 40 random bits: short enough to dictate, strong enough with single use, the TTL
// and the per-user redeem rate limit (ADR 0009).
export const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_GROUP_LENGTH = 4;
const INVITE_CODE_SEPARATOR = '-';

// Crockford base32 alphabet: no I, L, O, U, so codes read unambiguously when typed.
const CROCKFORD_BASE32_CLASS = '0-9A-HJKMNP-TV-Z';
const INVITE_CODE_PATTERN = new RegExp(`^[${CROCKFORD_BASE32_CLASS}]{${INVITE_CODE_LENGTH}}$`);
// Crockford decoding: letters people type for the digits they resemble.
const CROCKFORD_LOOKALIKES: Readonly<Record<string, string>> = { O: '0', I: '1', L: '1' };
const TYPING_NOISE = /[\s-]/g;

// What a person types (any case, spaces or dashes, O for 0, I or L for 1) maps to the one canonical code.
export const normalizeInviteCode = (raw: string): string =>
  raw
    .toUpperCase()
    .replace(TYPING_NOISE, '')
    .replace(/[OIL]/g, (letter) => CROCKFORD_LOOKALIKES[letter] ?? letter);

// Display form, grouped for reading aloud: ABCD-EFGH.
export const formatInviteCode = (code: string): string =>
  `${code.slice(0, INVITE_CODE_GROUP_LENGTH)}${INVITE_CODE_SEPARATOR}${code.slice(INVITE_CODE_GROUP_LENGTH)}`;

export const InviteCodeSchema = z.string().transform(normalizeInviteCode).pipe(z.string().regex(INVITE_CODE_PATTERN));
export type InviteCode = z.infer<typeof InviteCodeSchema>;

export const CreateInviteResponseSchema = z.object({
  id: UuidSchema,
  code: InviteCodeSchema,
  expiresAt: IsoDateTimeSchema,
});
export type CreateInviteResponse = z.infer<typeof CreateInviteResponseSchema>;

// Structure only: the server checks required consents itself so a missing one answers CONSENT_REQUIRED.
export const RedeemInviteBodySchema = z.object({
  code: InviteCodeSchema,
  consents: z
    .array(
      z.object({
        type: ConsentTypeSchema,
        version: z.string().min(1).max(CONSENT_VERSION_MAX_LENGTH),
        granted: z.boolean(),
      }),
    )
    .max(CONSENT_TYPES.length),
});
export type RedeemInviteBody = z.infer<typeof RedeemInviteBodySchema>;

export const RedeemInviteRequestSchema = z.object({
  code: InviteCodeSchema,
  consents: z.array(GrantConsentRequestSchema),
}).refine(
  (value) =>
    REQUIRED_CONSENT_TYPES.every((type) =>
      value.consents.some(
        (consent) =>
          consent.type === type && consent.granted && consent.version === CONSENT_VERSIONS[type],
      ),
    ),
  { path: ['consents'], error: 'Required consents must be granted at their current versions' },
);
export type RedeemInviteRequest = z.infer<typeof RedeemInviteRequestSchema>;
