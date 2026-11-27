import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put, Query, UseInterceptors } from '@nestjs/common';
import {
  type ClientPlansResponse,
  type PageQuery,
  PageQuerySchema,
  type Plan,
  type PlanVersionsPage,
  PutPlanRequestSchema,
  type PutPlanRequest,
  type User,
  UuidSchema,
} from '@noexcuse/contracts';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { IdempotencyInterceptor } from '../../infra/idempotency/idempotency.interceptor';
import { IdempotentDataSubject } from '../../infra/idempotency/idempotent-data-subject.decorator';
import { CurrentUser } from '../auth/session/current-user.decorator';
import { CoachingService } from '../coaching';
import { PlansService } from './plans.service';

const CLIENT_ID_PIPE = new ZodValidationPipe(UuidSchema);
const VersionParamSchema = z.coerce.number().int().min(1);

@Controller('coach/clients/:clientId/plan')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  getPlan(@CurrentUser() user: User, @Param('clientId', CLIENT_ID_PIPE) clientId: string): Promise<Plan> {
    return this.plans.getPlan(user, clientId);
  }

  @HttpCode(HttpStatus.OK)
  @Put()
  @IdempotentDataSubject('clientId')
  @UseInterceptors(IdempotencyInterceptor)
  putPlan(
    @CurrentUser() user: User,
    @Param('clientId', CLIENT_ID_PIPE) clientId: string,
    @Body(new ZodValidationPipe(PutPlanRequestSchema)) body: PutPlanRequest,
  ): Promise<Plan> {
    return this.plans.putPlan(user, clientId, body);
  }

  @Get('versions')
  listVersions(
    @CurrentUser() user: User,
    @Param('clientId', CLIENT_ID_PIPE) clientId: string,
    @Query(new ZodValidationPipe(PageQuerySchema)) query: PageQuery,
  ): Promise<PlanVersionsPage> {
    return this.plans.listVersions(user, clientId, query);
  }

  @Get('versions/:version')
  getVersion(
    @CurrentUser() user: User,
    @Param('clientId', CLIENT_ID_PIPE) clientId: string,
    @Param('version', new ZodValidationPipe(VersionParamSchema)) version: number,
  ): Promise<Plan> {
    return this.plans.getVersion(user, clientId, version);
  }
}

// The client's links are read here, not in the service: the service never reaches into the coaching module.
@Controller('client/plans')
export class ClientPlansController {
  constructor(
    private readonly plans: PlansService,
    private readonly coaching: CoachingService,
  ) {}

  @Get()
  async listOwnPlans(@CurrentUser() user: User): Promise<ClientPlansResponse> {
    return this.plans.listClientPlans(user, await this.coaching.findClientLinks(user.id));
  }
}
