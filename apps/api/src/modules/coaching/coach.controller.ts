import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  type CoachClientDetail,
  type CoachClientPage,
  type PageQuery,
  PageQuerySchema,
  UuidSchema,
  type User,
} from '@noexcuse/contracts';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { CurrentUser } from '../auth/session/current-user.decorator';
import { CoachingService } from './coaching.service';

@Controller('coach/clients')
export class CoachClientsController {
  constructor(private readonly coaching: CoachingService) {}

  @Get()
  listClients(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(PageQuerySchema)) query: PageQuery,
  ): Promise<CoachClientPage> {
    return this.coaching.listClients(user, query);
  }

  @Get(':clientId')
  getClient(
    @CurrentUser() user: User,
    @Param('clientId', new ZodValidationPipe(UuidSchema)) clientId: string,
  ): Promise<CoachClientDetail> {
    return this.coaching.getClientDetail(user, clientId);
  }
}
