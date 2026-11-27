import { Global, Module } from '@nestjs/common';
import { InfraModule } from '../../infra/infra.module';
import { CoachingModule, LINK_LIFECYCLE_HOOK } from '../coaching';
import { SessionModule } from '../auth/session/session.module';
import { CalendarController, ClientCalendarController } from './calendar.controller';
import { PlansRepository } from './plans.repository';
import { PlansService } from './plans.service';
import { ClientPlansController, PlansController } from './plans.controller';

// Global only to bind the coaching port: coaching injects LINK_LIFECYCLE_HOOK and never imports plans.
@Global()
@Module({
  imports: [InfraModule, SessionModule, CoachingModule],
  controllers: [PlansController, ClientPlansController, CalendarController, ClientCalendarController],
  providers: [PlansService, PlansRepository, { provide: LINK_LIFECYCLE_HOOK, useExisting: PlansService }],
  exports: [PlansService, LINK_LIFECYCLE_HOOK],
})
export class PlansModule {}
