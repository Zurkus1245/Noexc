import { type DynamicModule, Global, Module } from '@nestjs/common';
import { type AppConfig, CONFIG } from './config';

// The config is validated by the caller (loadConfig) before Nest boots, so an invalid environment aborts startup.
@Global()
@Module({})
export class ConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: CONFIG, useValue: config }],
      exports: [CONFIG],
    };
  }
}
