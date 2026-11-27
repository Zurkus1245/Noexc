import { z } from 'zod';
import { tolerantEnum } from './common';

export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'PROFILE_REQUIRED',
  'PROFILE_EXISTS',
  'FORBIDDEN_ROLE',
  'NOT_FOUND',
  'INVITE_INVALID',
  'LINK_EXISTS',
  'INVALID_TRANSITION',
  'CONSENT_REQUIRED',
  'RATE_LIMITED',
  'IDEMPOTENCY_CONFLICT',
  'VERSION_CONFLICT',
  'WORKOUT_SCHEDULED',
  'WORKOUT_NOT_IN_PLAN',
  'ENTRY_ID_CONFLICT',
  'ENTRY_IN_PAST',
  'INTERNAL',
] as const;

export const ErrorCodeSchema = tolerantEnum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

const HTTP_ERROR_STATUS_MIN = 400;
const HTTP_ERROR_STATUS_MAX = 599;

export const ValidationIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int().min(HTTP_ERROR_STATUS_MIN).max(HTTP_ERROR_STATUS_MAX),
  code: ErrorCodeSchema,
  detail: z.string(),
  requestId: z.string(),
  errors: z.array(ValidationIssueSchema).optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
