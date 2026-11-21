import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { LocalTokenRequestSchema, type LocalTokenResponse, RATE_LIMITS } from '@noexcuse/contracts';
import { parseOrThrow } from '../../../common/validation/zod-validation.pipe';
import type { RequestWithContext } from '../../../common/request/request-context';
import { RateLimiter } from '../../../infra/rate-limit/rate-limiter.service';
import { Public } from '../public.decorator';
import { LocalTokenIssuer } from './local-token-issuer';

const UNKNOWN_ADDRESS = 'unknown';

@Controller('auth/local')
export class LocalAuthController {
  constructor(
    private readonly issuer: LocalTokenIssuer,
    private readonly rateLimiter: RateLimiter,
  ) {}

  // The body is read raw so the attempt is counted before validation: malformed requests spend the budget too.
  @Public()
  @Post('token')
  async issueToken(@Req() request: RequestWithContext, @Body() body: unknown): Promise<LocalTokenResponse> {
    await this.rateLimiter.consume(`auth:local-token:${request.ip ?? UNKNOWN_ADDRESS}`, RATE_LIMITS.localTokenIssue);
    const { subject } = parseOrThrow(LocalTokenRequestSchema, body);
    return { accessToken: await this.issuer.issue(subject) };
  }

  @Public()
  @Get('jwks')
  jwks() {
    return this.issuer.jwks();
  }
}
