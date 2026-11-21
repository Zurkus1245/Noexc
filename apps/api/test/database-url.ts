export const TEST_DATABASE_SCHEMA = 'test';

// Tests run in their own Postgres schema, never in the schema the developer's data lives in.
export function toTestDatabaseUrl(url: string | undefined): string {
  if (url === undefined) {
    throw new Error('DATABASE_URL is required to run the API tests');
  }
  const parsed = new URL(url);
  parsed.searchParams.set('schema', TEST_DATABASE_SCHEMA);
  return parsed.toString();
}
