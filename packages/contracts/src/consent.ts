import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema, tolerantEnum } from './common';

export const CONSENT_TYPES = ['tos', 'health_data', 'coach_access', 'marketing'] as const;
export const ConsentTypeSchema = z.enum(CONSENT_TYPES);
export type ConsentType = z.infer<typeof ConsentTypeSchema>;

// Versioned so that a consent given to an older text is not treated as current.
export const CONSENT_VERSIONS = {
  tos: '2026-11-01',
  health_data: '2026-11-01',
  coach_access: '2026-11-01',
  marketing: '2026-11-01',
} as const satisfies Record<ConsentType, string>;

// Mirrors the consent.version column width in the API database.
export const CONSENT_VERSION_MAX_LENGTH = 32;

// Consents without which a client cannot link to a coach; marketing is optional.
export const REQUIRED_CONSENT_TYPES = ['tos', 'health_data', 'coach_access'] as const satisfies readonly ConsentType[];

export const ConsentSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  type: tolerantEnum(CONSENT_TYPES),
  version: z.string().min(1),
  granted: z.boolean(),
  createdAt: IsoDateTimeSchema,
});
export type Consent = z.infer<typeof ConsentSchema>;

// A decision is only meaningful for the text the user actually saw, i.e. the current version.
export const GrantConsentRequestSchema = z
  .object({
    type: ConsentTypeSchema,
    version: z.string().min(1),
    granted: z.boolean(),
  })
  .refine((value) => value.version === CONSENT_VERSIONS[value.type], {
    error: 'Consent version is not current',
    path: ['version'],
  });
export type GrantConsentRequest = z.infer<typeof GrantConsentRequestSchema>;
