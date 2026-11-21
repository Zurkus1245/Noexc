import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { type Observable, catchError, from, of, switchMap, throwError } from 'rxjs';
import { UuidSchema } from '@noexcuse/contracts';
import { ApiError } from '../../common/errors/api-error';
import { CLOCK, type Clock } from '../../common/clock/clock';
import { type RequestWithContext, requireSubject } from '../../common/request/request-context';
import { isUniqueViolation } from '../../common/prisma/prisma-errors';
import type { Prisma } from '../../generated/prisma/client';
import { IDEMPOTENT_WITHOUT_REPLAY_KEY } from './idempotent-without-replay.decorator';
import { IdempotencyRepository, type RecordKey } from './idempotency.repository';

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const BAD_REQUEST_STATUS = 400;
const CONFLICT_STATUS = 409;

// Opt-in per route. A repeated key replays the stored response; the same key with another body is a conflict.
// On a route marked @IdempotentWithoutReplay the body is never stored, so a repeated key is always a conflict.
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly records: IdempotencyRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const rawKey = request.headers[IDEMPOTENCY_KEY_HEADER];
    if (rawKey === undefined) return next.handle();

    const parsedKey = UuidSchema.safeParse(rawKey);
    if (!parsedKey.success) {
      throw new ApiError(BAD_REQUEST_STATUS, 'VALIDATION_FAILED', 'Idempotency-Key must be a UUID', [
        { path: IDEMPOTENCY_KEY_HEADER, message: 'must be a UUID' },
      ]);
    }
    const recordKey: RecordKey = { subject: requireSubject(request), key: parsedKey.data };
    const requestHash = hashRequest(request);
    const now = this.clock.now();
    const withoutReplay = this.isWithoutReplay(context);

    const existing = await this.records.find(recordKey);
    if (existing !== null && existing.expiresAt.getTime() > now.getTime()) {
      if (withoutReplay || existing.requestHash !== requestHash || existing.responseStatus === null) {
        throw conflict();
      }
      http.getResponse<Response>().status(existing.responseStatus);
      return of(existing.responseBody);
    }
    // Expired records only: a concurrent request may have reserved the key just now, and that reservation must survive.
    if (existing !== null) await this.records.releaseExpired(recordKey, now);

    await this.reserve(recordKey, requestHash, now);

    return next.handle().pipe(
      switchMap(async (body: unknown) => {
        const storedBody = withoutReplay ? null : toJson(body);
        await this.records.complete(recordKey, http.getResponse<Response>().statusCode, storedBody);
        return body;
      }),
      // A failed attempt must not block a retry with the same key.
      catchError((error: unknown) =>
        from(this.records.release(recordKey)).pipe(switchMap(() => throwError(() => error))),
      ),
    );
  }

  private isWithoutReplay(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean | undefined>(IDEMPOTENT_WITHOUT_REPLAY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private async reserve(recordKey: RecordKey, requestHash: string, now: Date): Promise<void> {
    try {
      await this.records.insert({
        ...recordKey,
        requestHash,
        createdAt: now,
        expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
      });
    } catch (error) {
      // Lost the insert race: the request holding this key is still in flight.
      if (isUniqueViolation(error)) throw conflict();
      throw error;
    }
  }
}

function hashRequest(request: RequestWithContext): string {
  return createHash('sha256')
    .update(`${request.method} ${request.path}\n${JSON.stringify(request.body ?? null)}`)
    .digest('hex');
}

function toJson(body: unknown): Prisma.InputJsonValue | null {
  if (body === undefined) return null;
  return JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue;
}

function conflict(): ApiError {
  return new ApiError(CONFLICT_STATUS, 'IDEMPOTENCY_CONFLICT', 'Idempotency-Key is already used for another request');
}
