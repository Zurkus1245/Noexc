import { Module } from '@nestjs/common';
import { ResolveCurrentUserPipe } from './current-user.decorator';
import { SessionRepository } from './session.repository';
import { SessionService } from './session.service';

// Who the caller is. Shared by identity and coaching so that neither needs the other for profile resolution.
@Module({
  providers: [SessionRepository, SessionService, ResolveCurrentUserPipe],
  exports: [SessionService, ResolveCurrentUserPipe],
})
export class SessionModule {}
