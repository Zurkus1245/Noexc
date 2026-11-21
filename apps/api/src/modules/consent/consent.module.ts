import { Module } from '@nestjs/common';
import { InfraModule } from '../../infra/infra.module';
import { SessionModule } from '../auth/session/session.module';
import { ConsentController } from './consent.controller';
import { ConsentRepository } from './consent.repository';
import { ConsentService } from './consent.service';

// Owns the append-only Consent table. Depends on nothing but auth/session, so coaching and identity can both use it.
@Module({
  imports: [InfraModule, SessionModule],
  controllers: [ConsentController],
  providers: [ConsentService, ConsentRepository],
  exports: [ConsentService],
})
export class ConsentModule {}
