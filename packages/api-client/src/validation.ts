import type { ZodType } from 'zod';
import { ApiError } from './errors';

interface RawIssue {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

const toValidationIssues = (issues: readonly RawIssue[]) =>
  issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message }));

const parse = <T>(
  schema: ZodType<T>,
  value: unknown,
  code: 'INVALID_REQUEST' | 'INVALID_RESPONSE',
  detail: string,
): T => {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new ApiError({ code, status: null, requestId: null, detail, errors: toValidationIssues(result.error.issues) });
};

// Outgoing payloads are checked with the contract schema before any network call.
export const parseRequest = <T>(schema: ZodType<T>, value: unknown): T =>
  parse(schema, value, 'INVALID_REQUEST', 'Request failed client-side validation');

// Unknown fields are stripped by zod's default object behaviour, so server additions do not break the client.
export const parseResponse = <T>(schema: ZodType<T>, value: unknown): T =>
  parse(schema, value, 'INVALID_RESPONSE', 'Response does not match the contract');
