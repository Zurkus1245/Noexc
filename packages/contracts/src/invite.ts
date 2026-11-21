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
export const INVITE_CODE_LENGTH = 26;

// Crockford base32 alphabet: no I, L, O, U, so codes read unambiguously when typed.
const CROCKFORD_BASE32_CLASS = '0-9A-HJKMNP-TV-Z';
const INVITE_CODE_PATTERN = new RegExp(`^[${CROCKFORD_BASE32_CLASS}]{${INVITE_CODE_LENGTH}}$`);

export const InviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(INVITE_CODE_PATTERN);
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
