import { Module } from '@nestjs/common';
import { InfraModule } from '../../../infra/infra.module';
import { LocalAuthController } from './local-auth.controller';
import { LocalTokenIssuer } from './local-token-issuer';

// Imported by AppModule only when AUTH_MODE=local; in managed-OIDC mode these routes do not exist.
@Module({
  imports: [InfraModule],
  controllers: [LocalAuthController],
  providers: [LocalTokenIssuer],
})
export class LocalAuthModule {}
