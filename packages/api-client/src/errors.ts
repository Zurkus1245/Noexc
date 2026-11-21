import type { ErrorCode, ValidationIssue } from '@noexcuse/contracts';

// Codes raised by the client itself. They are not part of the server contract (ErrorCode).
export const CLIENT_ERROR_CODES = ['NETWORK_ERROR', 'INVALID_RESPONSE', 'INVALID_REQUEST'] as const;
export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];

export type ApiErrorCode = ErrorCode | ClientErrorCode;

export interface ApiErrorInit {
  readonly code: ApiErrorCode;
  // null when no HTTP response exists (network failure, client-side validation).
  readonly status: number | null;
  readonly requestId: string | null;
  readonly detail: string;
  readonly errors?: readonly ValidationIssue[];
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  readonly requestId: string | null;
  readonly detail: string;
  readonly errors: readonly ValidationIssue[];

  constructor(init: ApiErrorInit, options?: { cause?: unknown }) {
    super(init.detail, options);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.requestId = init.requestId;
    this.detail = init.detail;
    this.errors = init.errors ?? [];
  }
}
