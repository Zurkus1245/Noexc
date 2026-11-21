import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import {
  type ClientLinksPage,
  type CoachClient,
  PageQuerySchema,
  type PageQuery,
  UuidSchema,
  type User,
} from '@noexcuse/contracts';
import type { LinkAction } from '@noexcuse/domain';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { IdempotencyInterceptor } from '../../infra/idempotency/idempotency.interceptor';
import { CurrentUser } from '../auth/session/current-user.decorator';
import { CoachingService } from './coaching.service';

const LINK_ID_PIPE = new ZodValidationPipe(UuidSchema);

@Controller('client/links')
export class ClientLinksController {
  constructor(private readonly coaching: CoachingService) {}

  @Get()
  listOwnLinks(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(PageQuerySchema)) query: PageQuery,
  ): Promise<ClientLinksPage> {
    return this.coaching.listOwnLinks(user, query);
  }
}

@Controller('links')
export class LinkActionsController {
  constructor(private readonly coaching: CoachingService) {}

  @HttpCode(HttpStatus.OK)
  @Post(':linkId/pause')
  @UseInterceptors(IdempotencyInterceptor)
  pause(@CurrentUser() user: User, @Param('linkId', LINK_ID_PIPE) linkId: string): Promise<CoachClient> {
    return this.act(user, linkId, 'pause');
  }

  @HttpCode(HttpStatus.OK)
  @Post(':linkId/resume')
  @UseInterceptors(IdempotencyInterceptor)
  resume(@CurrentUser() user: User, @Param('linkId', LINK_ID_PIPE) linkId: string): Promise<CoachClient> {
    return this.act(user, linkId, 'resume');
  }

  @HttpCode(HttpStatus.OK)
  @Post(':linkId/end')
  @UseInterceptors(IdempotencyInterceptor)
  end(@CurrentUser() user: User, @Param('linkId', LINK_ID_PIPE) linkId: string): Promise<CoachClient> {
    return this.act(user, linkId, 'end');
  }

  private act(user: User, linkId: string, action: LinkAction): Promise<CoachClient> {
    return this.coaching.transitionLink(user, linkId, action);
  }
}
