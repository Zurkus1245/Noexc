import { ApiError, type ApiErrorCode } from '@noexcuse/api-client';
import type { MessageKey } from '../i18n';

// Exhaustive over every code the client can produce; the UI shows these keys, never server detail text.
const MESSAGE_KEY_BY_CODE: Record<ApiErrorCode, MessageKey> = {
  VALIDATION_FAILED: 'error.VALIDATION_FAILED',
  UNAUTHENTICATED: 'error.UNAUTHENTICATED',
  PROFILE_REQUIRED: 'error.PROFILE_REQUIRED',
  PROFILE_EXISTS: 'error.PROFILE_EXISTS',
  FORBIDDEN_ROLE: 'error.FORBIDDEN_ROLE',
  NOT_FOUND: 'error.NOT_FOUND',
  INVITE_INVALID: 'error.INVITE_INVALID',
  LINK_EXISTS: 'error.LINK_EXISTS',
  INVALID_TRANSITION: 'error.INVALID_TRANSITION',
  CONSENT_REQUIRED: 'error.CONSENT_REQUIRED',
  RATE_LIMITED: 'error.RATE_LIMITED',
  IDEMPOTENCY_CONFLICT: 'error.IDEMPOTENCY_CONFLICT',
  VERSION_CONFLICT: 'error.VERSION_CONFLICT',
  WORKOUT_SCHEDULED: 'error.WORKOUT_SCHEDULED',
  WORKOUT_NOT_IN_PLAN: 'error.WORKOUT_NOT_IN_PLAN',
  ENTRY_ID_CONFLICT: 'error.ENTRY_ID_CONFLICT',
  INTERNAL: 'error.INTERNAL',
  unknown: 'error.INTERNAL',
  NETWORK_ERROR: 'error.NETWORK_ERROR',
  INVALID_RESPONSE: 'error.INVALID_RESPONSE',
  INVALID_REQUEST: 'error.INVALID_REQUEST',
};

// Only transient failures get a retry button; a server answer is retried by the user acting again.
const RETRYABLE_CODES: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>(['NETWORK_ERROR', 'INTERNAL']);

export interface ErrorPresentation {
  readonly messageKey: MessageKey;
  readonly retryable: boolean;
}

export const presentError = (error: unknown): ErrorPresentation => {
  if (!(error instanceof ApiError)) return { messageKey: 'error.INTERNAL', retryable: false };
  return { messageKey: MESSAGE_KEY_BY_CODE[error.code], retryable: RETRYABLE_CODES.has(error.code) };
};

export const isNetworkError = (error: unknown): boolean =>
  error instanceof ApiError && error.code === 'NETWORK_ERROR';

export const isNotFoundError = (error: unknown): boolean => error instanceof ApiError && error.code === 'NOT_FOUND';

export const isVersionConflictError = (error: unknown): boolean =>
  error instanceof ApiError && error.code === 'VERSION_CONFLICT';
