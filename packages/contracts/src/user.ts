import { z } from 'zod';
import { IanaTimezoneSchema, IsoDateTimeSchema, UuidSchema, tolerantEnum } from './common';

export const ROLES = ['coach', 'client'] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const DISPLAY_NAME_MIN_LENGTH = 1;
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const DisplayNameSchema = z.string().trim().min(DISPLAY_NAME_MIN_LENGTH).max(DISPLAY_NAME_MAX_LENGTH);

export const UserSchema = z.object({
  id: UuidSchema,
  role: tolerantEnum(ROLES),
  displayName: DisplayNameSchema,
  timezone: IanaTimezoneSchema,
  createdAt: IsoDateTimeSchema,
});
export type User = z.infer<typeof UserSchema>;

export const CreateProfileRequestSchema = z.object({
  role: RoleSchema,
  displayName: DisplayNameSchema,
  timezone: IanaTimezoneSchema,
});
export type CreateProfileRequest = z.infer<typeof CreateProfileRequestSchema>;

export const UpdateProfileRequestSchema = z
  .object({
    displayName: DisplayNameSchema.optional(),
    timezone: IanaTimezoneSchema.optional(),
  })
  .refine((value) => value.displayName !== undefined || value.timezone !== undefined, {
    error: 'At least one field must be provided',
  });
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
