import { Module } from '@nestjs/common';
import { InfraModule } from '../../infra/infra.module';
import { CoachingModule } from '../coaching/coaching.module';
import { ConsentModule } from '../consent/consent.module';
import { SessionModule } from '../auth/session/session.module';
import { IdentityController } from './identity.controller';
import { IdentityRepository } from './identity.repository';
import { IdentityService } from './identity.service';

// Identity depends on coaching (account deletion and export via its public service) and on consent. Neither depends back.
@Module({
  imports: [InfraModule, SessionModule, CoachingModule, ConsentModule],
  controllers: [IdentityController],
  providers: [IdentityService, IdentityRepository],
  exports: [IdentityService],
})
export class IdentityModule {}
