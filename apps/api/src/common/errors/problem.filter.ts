import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import type { ErrorCode, ProblemDetails } from '@noexcuse/contracts';
import { ApiError } from './api-error';
import { AppLogger } from '../logging/app-logger';
import type { RequestWithContext } from '../request/request-context';

const PROBLEM_CONTENT_TYPE = 'application/problem+json';
const PROBLEM_TYPE_UNSPECIFIED = 'about:blank';
const BAD_REQUEST_STATUS = 400;
const INTERNAL_ERROR_STATUS = 500;
const INTERNAL_ERROR_DETAIL = 'Unexpected error';
const FRAMEWORK_ERROR_DETAIL = 'Request failed';
const BODY_PARSE_ERROR_TYPE = 'entity.parse.failed';

// Status-only mapping for framework errors (unknown route, malformed body, ...).
const HTTP_STATUS_TO_CODE: Readonly<Record<number, ErrorCode>> = {
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN_ROLE',
  404: 'NOT_FOUND',
  429: 'RATE_LIMITED',
};

// Fixed text per status. Framework messages are never forwarded: a JSON parse error can echo request body text.
const HTTP_STATUS_TO_DETAIL: Readonly<Record<number, string>> = {
  400: 'Malformed request',
  401: 'Authentication required',
  403: 'Forbidden',
  404: 'Route not found',
  405: 'Method not allowed',
  413: 'Request body too large',
  429: 'Too many requests, try again later',
};

const codeForStatus = (status: number): ErrorCode => {
  if (status >= INTERNAL_ERROR_STATUS) return 'INTERNAL';
  return HTTP_STATUS_TO_CODE[status] ?? 'VALIDATION_FAILED';
};

const detailForStatus = (status: number): string => {
  if (status >= INTERNAL_ERROR_STATUS) return INTERNAL_ERROR_DETAIL;
  return HTTP_STATUS_TO_DETAIL[status] ?? FRAMEWORK_ERROR_DETAIL;
};

// body-parser reports a malformed JSON body as a SyntaxError carrying its own type; it is not an HttpException.
const isBodyParseError = (exception: unknown): boolean =>
  typeof exception === 'object' && exception !== null && 'type' in exception && exception.type === BODY_PARSE_ERROR_TYPE;

@Catch()
export class ProblemFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithContext & Request>();
    const response = context.getResponse<Response>();
    const requestId = request.requestId ?? '';

    const problem = this.toProblem(exception, requestId);
    response.status(problem.status).type(PROBLEM_CONTENT_TYPE).json(problem);
  }

  private toProblem(exception: unknown, requestId: string): ProblemDetails {
    if (exception instanceof ApiError) {
      return this.build(exception.status, exception.code, exception.message, requestId, exception.errors);
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return this.build(status, codeForStatus(status), detailForStatus(status), requestId);
    }
    if (isBodyParseError(exception)) {
      return this.build(BAD_REQUEST_STATUS, codeForStatus(BAD_REQUEST_STATUS), detailForStatus(BAD_REQUEST_STATUS), requestId);
    }
    // Only the error name is logged: messages can carry request data.
    this.logger.error('unhandled_exception', { requestId, errorName: errorName(exception) });
    return this.build(INTERNAL_ERROR_STATUS, 'INTERNAL', INTERNAL_ERROR_DETAIL, requestId);
  }

  private build(
    status: number,
    code: ErrorCode,
    detail: string,
    requestId: string,
    errors?: ProblemDetails['errors'],
  ): ProblemDetails {
    return {
      type: PROBLEM_TYPE_UNSPECIFIED,
      title: STATUS_CODES[status] ?? INTERNAL_ERROR_DETAIL,
      status,
      code,
      detail,
      requestId,
      ...(errors === undefined ? {} : { errors }),
    };
  }
}

function errorName(exception: unknown): string {
  return exception instanceof Error ? exception.name : typeof exception;
}
