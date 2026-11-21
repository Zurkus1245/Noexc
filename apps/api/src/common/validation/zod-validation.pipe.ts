import type { PipeTransform } from '@nestjs/common';
import type { ValidationIssue } from '@noexcuse/contracts';
import type { z } from 'zod';
import { ApiError } from '../errors/api-error';

const BAD_REQUEST = 400;
const VALIDATION_FAILED_DETAIL = 'Request validation failed';

// Every input is parsed with the shared contract schema; no hand-written DTO validation.
export function parseOrThrow<TSchema extends z.ZodType>(schema: TSchema, value: unknown): z.output<TSchema> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const errors: ValidationIssue[] = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  throw new ApiError(BAD_REQUEST, 'VALIDATION_FAILED', VALIDATION_FAILED_DETAIL, errors);
}

export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    return parseOrThrow(this.schema, value);
  }
}
