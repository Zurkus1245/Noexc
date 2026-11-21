import type { ErrorCode, ValidationIssue } from '@noexcuse/contracts';

// Domain and transport failures that map 1:1 onto an RFC 9457 problem response.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    detail: string,
    readonly errors?: ValidationIssue[],
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}
