import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors/api-error';
import type { AppLogger } from '../logging/app-logger';

export const REQUEST_ID_HEADER = 'X-Request-Id';
const UNMATCHED_ROUTE = 'unmatched';
const UNAUTHORIZED_STATUS = 401;

export type RequestWithContext = Request & {
  requestId?: string;
  auth?: { subject: string };
};

// The auth guard sets the subject on every protected route; reaching this without it is a wiring defect.
export function requireSubject(request: RequestWithContext): string {
  const subject = request.auth?.subject;
  if (subject === undefined) {
    throw new ApiError(UNAUTHORIZED_STATUS, 'UNAUTHENTICATED', 'Authentication required');
  }
  return subject;
}

// Generated server-side: a client-supplied id would let callers forge correlation ids in logs.
export const requestContext =
  (logger: AppLogger) =>
  (request: RequestWithContext, response: Response, next: NextFunction): void => {
    const requestId = randomUUID();
    const startedAt = performance.now();
    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    response.on('finish', () => {
      logger.info('request_completed', {
        requestId,
        method: request.method,
        route: request.route?.path ?? UNMATCHED_ROUTE,
        status: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      });
    });
    next();
  };
