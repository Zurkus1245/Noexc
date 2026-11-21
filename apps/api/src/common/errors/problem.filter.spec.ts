import { type ArgumentsHost, BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { ProblemDetailsSchema } from '@noexcuse/contracts';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AppLogger } from '../logging/app-logger';
import { ApiError } from './api-error';
import { ProblemFilter } from './problem.filter';

const REQUEST_ID = '6f1c2a4e-8d3b-4e7a-9c1f-2b5d7e9a0c11';

function setup() {
  const response = {
    status: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const request = { requestId: REQUEST_ID } as unknown as Request;
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response as unknown as Response,
    }),
  } as unknown as ArgumentsHost;
  const logger = new AppLogger();
  const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  const filter = new ProblemFilter(logger);
  const send = (exception: unknown) => {
    filter.catch(exception, host);
    const body: unknown = response.json.mock.calls[0]?.[0];
    return { body: ProblemDetailsSchema.parse(body), response, errorLog };
  };
  return { send };
}

describe('ProblemFilter', () => {
  it('maps an ApiError to its status, code, detail and validation issues', () => {
    const { send } = setup();

    const { body, response } = send(
      new ApiError(400, 'VALIDATION_FAILED', 'Request validation failed', [{ path: 'displayName', message: 'Too long' }]),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.type).toHaveBeenCalledWith('application/problem+json');
    expect(body).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      detail: 'Request validation failed',
      requestId: REQUEST_ID,
      errors: [{ path: 'displayName', message: 'Too long' }],
    });
  });

  it('maps framework HTTP exceptions by status', () => {
    const { send } = setup();

    const { body } = send(new NotFoundException('Cannot GET /x'));

    expect(body).toMatchObject({ status: 404, code: 'NOT_FOUND', detail: 'Route not found' });
    expect(body.errors).toBeUndefined();
  });

  it('never forwards a framework message: a malformed JSON body is answered without echoing it', () => {
    const { send } = setup();
    // Shape of the error body-parser raises for a malformed JSON request body.
    const parseError = Object.assign(new SyntaxError('Unexpected token s in JSON at position 1 near "secret-body-text"'), {
      type: 'entity.parse.failed',
      status: 400,
    });

    const { body, errorLog } = send(parseError);

    expect(body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', detail: 'Malformed request' });
    expect(JSON.stringify(body)).not.toContain('secret-body-text');
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('never forwards a framework HttpException message, whatever its text', () => {
    const { send } = setup();

    const { body } = send(new BadRequestException('echo: {"displayName":"secret-body-text"}'));

    expect(body).toMatchObject({ status: 400, detail: 'Malformed request' });
    expect(JSON.stringify(body)).not.toContain('secret-body-text');
  });

  it('maps any other failure to INTERNAL without leaking its message', () => {
    const { send } = setup();

    const { body, errorLog } = send(new Error('connection to db-host failed for user alice@example.com'));

    expect(body).toMatchObject({ status: 500, code: 'INTERNAL', detail: 'Unexpected error', requestId: REQUEST_ID });
    expect(errorLog).toHaveBeenCalledWith('unhandled_exception', { requestId: REQUEST_ID, errorName: 'Error' });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('alice@example.com');
  });

  it('uses the exception status for HttpException subclasses', () => {
    const { send } = setup();

    const { body } = send(new HttpException('Too Many', 429));

    expect(body).toMatchObject({ status: 429, code: 'RATE_LIMITED' });
  });
});
