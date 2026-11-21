import { execFileSync } from 'node:child_process';
import { toTestDatabaseUrl } from './database-url';

const PRISMA_CLI = 'node_modules/prisma/build/index.js';

// Brings the test schema to the latest migration once per run; tests then truncate between cases.
export default function setup(): void {
  execFileSync(process.execPath, [PRISMA_CLI, 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: toTestDatabaseUrl(process.env.DATABASE_URL) },
  });
}
