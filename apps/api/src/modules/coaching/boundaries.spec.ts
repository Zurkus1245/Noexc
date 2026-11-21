import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Module boundaries as code: consent and profile data belong to other modules and are reached through their services.
const COACHING_DIR = fileURLToPath(new URL('.', import.meta.url));
const FOREIGN_TABLE_ACCESS = /\b(prisma|tx)\.(consent|user)\b/;
const USER_RELATION_INCLUDE = /include:\s*\{\s*(client|coach)\s*:/;
const IDENTITY_IMPORT = /modules\/identity\//;

const sources = readdirSync(COACHING_DIR)
  .filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
  .map((file) => ({ file, text: readFileSync(`${COACHING_DIR}${file}`, 'utf8') }));

describe('coaching module boundaries', () => {
  it('never reads or writes the Consent or User tables', () => {
    const offenders = sources.filter(({ text }) => FOREIGN_TABLE_ACCESS.test(text)).map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it('never loads user rows through a relation include', () => {
    const offenders = sources.filter(({ text }) => USER_RELATION_INCLUDE.test(text)).map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it('does not import the identity module', () => {
    const offenders = sources.filter(({ text }) => IDENTITY_IMPORT.test(text)).map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});
