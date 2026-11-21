import { defineConfig } from 'prisma/config';

// The URL is optional so that `prisma generate` runs on install without a database; migrate commands need it.
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...(databaseUrl === undefined ? {} : { datasource: { url: databaseUrl } }),
});
