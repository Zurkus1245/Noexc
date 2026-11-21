import { Body, Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import { type Consent, GrantConsentRequestSchema, type GrantConsentRequest, type User } from '@noexcuse/contracts';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { IdempotencyInterceptor } from '../../infra/idempotency/idempotency.interceptor';
import { CurrentUser } from '../auth/session/current-user.decorator';
import { ConsentService } from './consent.service';

@Controller('me/consents')
export class ConsentController {
  constructor(private readonly consents: ConsentService) {}

  @Get()
  listConsents(@CurrentUser() user: User): Promise<Consent[]> {
    return this.consents.list(user.id);
  }

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  grantConsent(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(GrantConsentRequestSchema)) body: GrantConsentRequest,
  ): Promise<Consent> {
    return this.consents.grant(user.id, body);
  }
}
