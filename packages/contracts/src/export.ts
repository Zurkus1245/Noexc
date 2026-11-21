import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common';
import { ConsentSchema } from './consent';
import { CoachClientSchema } from './coaching';
import { UserSchema } from './user';

// Invite codes and their hashes are deliberately absent: they are secrets, not personal data to hand back.
const OwnInviteSchema = z.object({
  id: UuidSchema,
  coachId: UuidSchema,
  expiresAt: IsoDateTimeSchema,
  usedAt: IsoDateTimeSchema.nullable(),
  revokedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

export const AccountExportSchema = z.object({
  exportedAt: IsoDateTimeSchema,
  user: UserSchema,
  consents: z.array(ConsentSchema),
  links: z.array(CoachClientSchema),
  invites: z.array(OwnInviteSchema),
});
export type AccountExport = z.infer<typeof AccountExportSchema>;
