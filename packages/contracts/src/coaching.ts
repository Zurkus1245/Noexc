import { z } from 'zod';
import { IanaTimezoneSchema, IsoDateTimeSchema, UuidSchema, cursorPage, tolerantEnum } from './common';
import { DisplayNameSchema } from './user';

export const LINK_STATUSES = ['active', 'paused', 'ended'] as const;
export const LinkStatusSchema = tolerantEnum(LINK_STATUSES);
export type LinkStatus = z.infer<typeof LinkStatusSchema>;

export const ENDED_BY = ['coach', 'client', 'admin'] as const;
export const EndedBySchema = tolerantEnum(ENDED_BY);
export type EndedBy = z.infer<typeof EndedBySchema>;

// coachId / clientId are null only on an ended link whose user deleted their account.
export const CoachClientSchema = z.object({
  id: UuidSchema,
  coachId: UuidSchema.nullable(),
  clientId: UuidSchema.nullable(),
  status: LinkStatusSchema,
  createdAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
  endedBy: EndedBySchema.nullable(),
});
export type CoachClient = z.infer<typeof CoachClientSchema>;

// The link id is what pause/resume/end address; clientId is what the coach views.
export const CoachClientSummarySchema = z.object({
  id: UuidSchema,
  clientId: UuidSchema,
  displayName: DisplayNameSchema,
  status: LinkStatusSchema,
  createdAt: IsoDateTimeSchema,
});
export type CoachClientSummary = z.infer<typeof CoachClientSummarySchema>;

export const CoachClientPageSchema = cursorPage(CoachClientSummarySchema);
export type CoachClientPage = z.infer<typeof CoachClientPageSchema>;

// Coach-side detail of one client: the link that grants the view, plus the profile fields a coach may see in stage 1.
export const CoachClientDetailSchema = z.object({
  link: CoachClientSchema,
  client: z.object({
    id: UuidSchema,
    displayName: DisplayNameSchema,
    timezone: IanaTimezoneSchema,
  }),
});
export type CoachClientDetail = z.infer<typeof CoachClientDetailSchema>;

// Null coachId and coachDisplayName: the coach deleted their account; the ended link stays visible to the client.
export const ClientLinkSummarySchema = z.object({
  id: UuidSchema,
  coachId: UuidSchema.nullable(),
  coachDisplayName: DisplayNameSchema.nullable(),
  status: LinkStatusSchema,
  createdAt: IsoDateTimeSchema,
});
export type ClientLinkSummary = z.infer<typeof ClientLinkSummarySchema>;

export const ClientLinksPageSchema = cursorPage(ClientLinkSummarySchema);
export type ClientLinksPage = z.infer<typeof ClientLinksPageSchema>;
