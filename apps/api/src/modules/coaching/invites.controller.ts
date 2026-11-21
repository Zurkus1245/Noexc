import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, UseInterceptors } from '@nestjs/common';
import { type CoachClient, type CreateInviteResponse, UuidSchema, type User } from '@noexcuse/contracts';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { IdempotencyInterceptor } from '../../infra/idempotency/idempotency.interceptor';
import { IdempotentWithoutReplay } from '../../infra/idempotency/idempotent-without-replay.decorator';
import { CurrentUser } from '../auth/session/current-user.decorator';
import { CoachingService } from './coaching.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly coaching: CoachingService) {}

  // The response carries the plaintext code, so it is never stored for replay.
  @Post()
  @IdempotentWithoutReplay()
  @UseInterceptors(IdempotencyInterceptor)
  createInvite(@CurrentUser() user: User): Promise<CreateInviteResponse> {
    return this.coaching.createInvite(user);
  }

  // The body is read raw: the service validates it after the rate limit has counted the attempt.
  @Post('redeem')
  @UseInterceptors(IdempotencyInterceptor)
  redeemInvite(@CurrentUser() user: User, @Body() body: unknown): Promise<CoachClient> {
    return this.coaching.redeemInvite(user, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvite(
    @CurrentUser() user: User,
    @Param('id', new ZodValidationPipe(UuidSchema)) inviteId: string,
  ): Promise<void> {
    await this.coaching.revokeInvite(user, inviteId);
  }
}
