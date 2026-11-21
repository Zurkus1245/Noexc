// Public API snapshot of @noexcuse/contracts: declaration emit of src/, concatenated in path order.
// Default: regenerate docs/contracts/api.d.ts. --check: fail when the committed snapshot differs,
// so any change to the public contract must be committed together with its regenerated snapshot.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
const SNAPSHOT_PATH = resolve(PACKAGE_ROOT, '../../docs/contracts/api.d.ts');
const TEST_FILE_SUFFIX = '.test.ts';
const CHECK_FLAG = '--check';

const parseConfig = () => {
  const config = ts.getParsedCommandLineOfConfigFile(join(PACKAGE_ROOT, 'tsconfig.json'), undefined, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    },
  });
  if (config === undefined) throw new Error('packages/contracts/tsconfig.json could not be read');
  return config;
};

// Declarations are emitted to a temp dir so that nothing is written into the package during a check.
const emitDeclarations = (outDir) => {
  const config = parseConfig();
  const rootNames = config.fileNames.filter((file) => !file.endsWith(TEST_FILE_SUFFIX));
  const options = {
    ...config.options,
    declaration: true,
    emitDeclarationOnly: true,
    noEmit: false,
    outDir,
    rootDir: join(PACKAGE_ROOT, 'src'),
  };
  const program = ts.createProgram({ rootNames, options });
  const result = program.emit();
  const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
  if (diagnostics.length > 0) {
    throw new Error(ts.formatDiagnostics(diagnostics, { getCanonicalFileName: (f) => f, getCurrentDirectory: () => PACKAGE_ROOT, getNewLine: () => '\n' }));
  }
};

const listDeclarations = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.d.ts'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();

const buildSnapshot = (outDir) =>
  listDeclarations(outDir)
    .map((file) => `// ${relative(outDir, file).split('\\').join('/')}\n${readFileSync(file, 'utf8')}`)
    .join('\n');

const main = () => {
  const check = process.argv.includes(CHECK_FLAG);
  const outDir = mkdtempSync(join(tmpdir(), 'contracts-snapshot-'));
  try {
    emitDeclarations(outDir);
    const snapshot = buildSnapshot(outDir);
    if (check) {
      const committed = existsSync(SNAPSHOT_PATH) ? readFileSync(SNAPSHOT_PATH, 'utf8') : '';
      if (committed !== snapshot) {
        process.stderr.write('docs/contracts/api.d.ts is out of date: run `pnpm contracts:snapshot` and commit the result.\n');
        process.exitCode = 1;
      }
      return;
    }
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, snapshot);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
};

main();
