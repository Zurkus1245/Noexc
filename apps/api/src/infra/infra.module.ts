import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';
import { IdempotencyRepository } from './idempotency/idempotency.repository';
import { RateLimiter } from './rate-limit/rate-limiter.service';

// Cross-cutting services for feature modules: Postgres-backed rate limits and idempotent POSTs.
@Module({
  providers: [RateLimiter, IdempotencyRepository, IdempotencyInterceptor],
  exports: [RateLimiter, IdempotencyRepository, IdempotencyInterceptor],
})
export class InfraModule {}
