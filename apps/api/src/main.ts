import { NestFactory } from '@nestjs/core';
import { configureApp } from './app-setup';
import { AppModule } from './app.module';
import { loadConfig } from './config/config';

// Top-level: an invalid environment throws before any listener opens, so the process exits non-zero.
const config = loadConfig(process.env);
const app = await NestFactory.create(AppModule.register(config));
configureApp(app);
app.enableShutdownHooks();
await app.listen(config.port);
