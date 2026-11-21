# 0003 Monorepo tooling

Status: accepted.

## Context
CLAUDE.md requires pnpm workspaces with Turborepo, strict TypeScript and shared presets. Multiple packages
must agree on tool versions and configuration.

## Decision
- pnpm 10 (`packageManager` pinned) with Turborepo 2 for task orchestration.
- Shared versions live in the pnpm `catalog` in `pnpm-workspace.yaml`; packages reference `catalog:`.
- Shared presets live in `@noexcuse/config`: tsconfig base / node / nest, ESLint flat config, Prettier.
- Internal packages are consumed as TypeScript source (`exports` to `src/index.ts`); no build step for
  typecheck or test.
- TypeScript is pinned to 6.0.x because `typescript-eslint` 8.73 supports `typescript <6.1` only.
  TypeScript 7 is adopted only once `typescript-eslint` declares support for it.

## Consequences
- One place to bump each tool version.
- Upgrading TypeScript to 7 requires a new ADR or a `typescript-eslint` release that supports it.
- Turbo test tasks are uncached and receive only the declared environment variables (`passThroughEnv`).
