import { Module } from '@nestjs/common';
import { InfraModule } from '../../infra/infra.module';
import { ConsentModule } from '../consent/consent.module';
import { SessionModule } from '../auth/session/session.module';
import { AccessPolicy } from './access-policy.service';
import { CoachClientsController } from './coach.controller';
import { CoachingRepository } from './coaching.repository';
import { CoachingService } from './coaching.service';
import { INVITE_CODE_GENERATOR, RandomInviteCodeGenerator } from './invite-code';
import { InvitesController } from './invites.controller';
import { ClientLinksController, LinkActionsController } from './links.controller';

// Depends on consent and session only. Plans reacts to link end through the LINK_LIFECYCLE_HOOK port, bound in plans.
@Module({
  imports: [InfraModule, SessionModule, ConsentModule],
  controllers: [InvitesController, CoachClientsController, ClientLinksController, LinkActionsController],
  providers: [
    CoachingService,
    CoachingRepository,
    AccessPolicy,
    { provide: INVITE_CODE_GENERATOR, useClass: RandomInviteCodeGenerator },
  ],
  exports: [CoachingService, AccessPolicy],
})
export class CoachingModule {}
