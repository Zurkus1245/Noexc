# 0004 API build: Vite SSR with unplugin-swc

Status: proposed, awaiting founder approval.

## Context
`apps/api` is a NestJS service that depends on TypeScript workspace packages (`@noexcuse/contracts`, `@noexcuse/domain`)
consumed as source (ADR 0003). Nest needs decorator metadata (`emitDecoratorMetadata`) for dependency injection.
The stock options were `nest build` (tsc) and plain `tsc`:
- tsc with `module: NodeNext` requires explicit `.js` specifiers on every relative import and cannot bundle the
  workspace packages, so the emitted `dist` would still need those packages at runtime.
- The Nest CLI is webpack/tsc based and adds its own build config on top of the monorepo presets.

## Decision
- Build the server with Vite in SSR mode (`vite build --ssr src/main.ts`) into one ESM file `dist/main.js`.
- Compile TypeScript with `unplugin-swc` (SWC), which emits the decorator metadata Nest needs. The same plugin is
  used by Vitest, so tests and the production build share one transform.
- Type checking stays with `tsc --noEmit` (`typecheck` script). SWC and Vite do not type check.
- Resolve modules with `Bundler` resolution (`@noexcuse/config/tsconfig.nest.json` now extends the base preset).
  Relative imports are extensionless, the same as in `packages/*` and `apps/mobile`. The `NodeNext` preset is removed.
- Workspace packages are bundled into `main.js`; packages have no build step.

## Consequences
- One artifact (`dist/main.js`, plus sourcemap) is the deployable unit; no runtime `node_modules` resolution for workspace packages.
- Extensionless imports across api, packages and mobile: one convention, one resolver, no per-tool workarounds.
- Prisma's generated client (`src/generated/prisma`) is bundled with the app; the Prisma CLI still runs from `node_modules`.
- `minify` is off for debuggable stack traces. Revisit only if the bundle size matters.
- Build output is not type-checked: CI must run `typecheck` as well as `build` (it does via `turbo run typecheck`).
- Upgrading Vite or unplugin-swc is a change to the build chain and needs a note in this ADR.
