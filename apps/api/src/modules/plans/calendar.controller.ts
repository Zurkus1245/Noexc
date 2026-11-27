import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import {
  type CalendarEntriesResponse,
  type CalendarEntry,
  CalendarRangeQuerySchema,
  type CalendarRangeQuery,
  CreateCalendarEntryRequestSchema,
  type CreateCalendarEntryRequest,
  MoveCalendarEntryRequestSchema,
  type MoveCalendarEntryRequest,
  type User,
  UuidSchema,
} from '@noexcuse/contracts';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { IdempotencyInterceptor } from '../../infra/idempotency/idempotency.interceptor';
import { IdempotentDataSubject } from '../../infra/idempotency/idempotent-data-subject.decorator';
import { CurrentUser } from '../auth/session/current-user.decorator';
import { CoachingService } from '../coaching';
import { PlansService } from './plans.service';

const UUID_PIPE = new ZodValidationPipe(UuidSchema);
const RANGE_PIPE = new ZodValidationPipe(CalendarRangeQuerySchema);

@Controller('coach/clients/:clientId/calendar')
export class CalendarController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  list(
    @CurrentUser() user: User,
    @Param('clientId', UUID_PIPE) clientId: string,
    @Query(RANGE_PIPE) range: CalendarRangeQuery,
  ): Promise<CalendarEntriesResponse> {
    return this.plans.listEntries(user, clientId, range);
  }

  @Post()
  @IdempotentDataSubject('clientId')
  @UseInterceptors(IdempotencyInterceptor)
  create(
    @CurrentUser() user: User,
    @Param('clientId', UUID_PIPE) clientId: string,
    @Body(new ZodValidationPipe(CreateCalendarEntryRequestSchema)) body: CreateCalendarEntryRequest,
  ): Promise<CalendarEntry> {
    return this.plans.createEntry(user, clientId, body);
  }

  @Patch(':entryId')
  move(
    @CurrentUser() user: User,
    @Param('clientId', UUID_PIPE) clientId: string,
    @Param('entryId', UUID_PIPE) entryId: string,
    @Body(new ZodValidationPipe(MoveCalendarEntryRequestSchema)) body: MoveCalendarEntryRequest,
  ): Promise<CalendarEntry> {
    return this.plans.moveEntry(user, clientId, entryId, body);
  }

  @Delete(':entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: User,
    @Param('clientId', UUID_PIPE) clientId: string,
    @Param('entryId', UUID_PIPE) entryId: string,
  ): Promise<void> {
    await this.plans.deleteEntry(user, clientId, entryId);
  }
}

// Own entries across all links, including the past of ended links. The links are read here (see ClientPlansController).
@Controller('client/calendar')
export class ClientCalendarController {
  constructor(
    private readonly plans: PlansService,
    private readonly coaching: CoachingService,
  ) {}

  @Get()
  async list(@CurrentUser() user: User, @Query(RANGE_PIPE) range: CalendarRangeQuery): Promise<CalendarEntriesResponse> {
    return this.plans.listClientCalendar(user, range, await this.coaching.findClientLinks(user.id));
  }
}
