import { type DynamicModule, Module } from '@nestjs/common';
import { ClockModule } from './common/clock/clock';
import { CommonModule } from './common/common.module';
import { type AppConfig } from './config/config';
import { ConfigModule } from './config/config.module';
import { InfraModule } from './infra/infra.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoachingModule } from './modules/coaching/coaching.module';
import { LocalAuthModule } from './modules/auth/local/local-auth.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PlansModule } from './modules/plans/plans.module';

@Module({
  imports: [ClockModule, CommonModule, InfraModule, AuthModule, IdentityModule, CoachingModule, PlansModule],
})
export class AppModule {
  // The config is passed in, not read here: the environment is validated once, before any module is wired.
  static register(config: AppConfig): DynamicModule {
    const localAuth = config.auth.mode === 'local' ? [LocalAuthModule] : [];
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot(config), ...localAuth],
    };
  }
}
