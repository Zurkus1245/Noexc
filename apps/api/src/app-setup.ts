import type { INestApplication } from '@nestjs/common';
import { AppLogger } from './common/logging/app-logger';
import { requestContext } from './common/request/request-context';

export const API_PREFIX = 'v1';

// Shared by the server entrypoint and the e2e harness so both serve the same HTTP surface.
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.use(requestContext(app.get(AppLogger)));
}
