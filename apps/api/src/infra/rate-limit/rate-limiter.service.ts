import { Inject, Injectable } from '@nestjs/common';
import { ApiError } from '../../common/errors/api-error';
import { CLOCK, type Clock } from '../../common/clock/clock';
import { PrismaService } from '../../common/prisma/prisma.service';

const MS_PER_SECOND = 1000;
const TOO_MANY_REQUESTS = 429;

// Callers pass entries of RATE_LIMITS from contracts; the shape is structural so tests can use other windows.
export type RateLimitPolicy = { readonly limit: number; readonly windowSeconds: number };

// Fixed window counted in Postgres, so limits hold across stateless API instances.
@Injectable()
export class RateLimiter {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // Throws RATE_LIMITED once the caller's key has exceeded the policy in the current window.
  async consume(key: string, policy: RateLimitPolicy): Promise<void> {
    const windowMs = policy.windowSeconds * MS_PER_SECOND;
    const windowStart = new Date(Math.floor(this.clock.now().getTime() / windowMs) * windowMs);
    const [row] = await this.prisma.$queryRaw<{ hits: number }[]>`
      INSERT INTO "RateLimitHit" ("key", "windowStart", "hits")
      VALUES (${key}, ${windowStart}, 1)
      ON CONFLICT ("key", "windowStart") DO UPDATE SET "hits" = "RateLimitHit"."hits" + 1
      RETURNING "hits"`;

    if (row === undefined || row.hits > policy.limit) {
      throw new ApiError(TOO_MANY_REQUESTS, 'RATE_LIMITED', 'Too many requests, try again later');
    }
  }
}
