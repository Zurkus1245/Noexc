import { z } from 'zod';

export const AUTH_SUBJECT_MAX_LENGTH = 255;

// Local mode only (AUTH_MODE=local): the subject becomes the user's authSubject.
export const LocalTokenRequestSchema = z.object({
  subject: z.string().trim().min(1).max(AUTH_SUBJECT_MAX_LENGTH),
});
export type LocalTokenRequest = z.infer<typeof LocalTokenRequestSchema>;

export const LocalTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
});
export type LocalTokenResponse = z.infer<typeof LocalTokenResponseSchema>;
