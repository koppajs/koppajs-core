# Repository Map

## Purpose

This document explains what each major folder in this repository is responsible for.
It is descriptive of the repository as it exists today and should be updated when boundaries move.

## Top-Level Structure

### `src/`

Runtime source for `@koppajs/koppajs-core`.

- `src/index.ts`
  - public entry point
  - `Core` bootstrap and registration queue
  - public exports
- `src/component.ts`
  - custom element registration
  - component lifecycle orchestration
  - render scheduling and teardown
- `src/model.ts`
  - proxy-based reactivity
  - watcher registration
  - change batching
  - array slot identity sidecars
- `src/template-processor.ts`
  - directive processing
  - expression interpolation
  - loop and conditional handling
- `src/event-handler.ts`
  - declarative DOM event binding
  - custom event target wiring
- `src/global-event-cleaner.ts`
  - tracked listener cleanup and subtree cleanup
- `src/compose.ts`
  - multi-layer context composition helper
- `src/types.ts`
  - public type anchor and ambient contract surface
- `src/utils/`
  - focused internal runtime utilities
  - includes reconciliation, identity, script compilation, helpers, logger, and extension registry

### `test/`

Vitest suite for runtime behavior.

- Mirrors the runtime concerns by subsystem
- Includes helper utilities under `test/helpers/`
- Uses JSDOM through `test/setup.ts`

### Root config files

Repository configuration lives at the root:

- `tsconfig.json`
- `tsconfig.test.json`
- `tsconfig.types.json`
- `vite.config.ts`
- `vitest.config.ts`
- `eslint.config.mjs`
- `prettier.config.mjs`
- `lint-staged.config.js`
- `commitlint.config.mjs`

Nothing in these files should be imported by runtime source.

### `.github/workflows/`

Automation for CI and release.

- `ci.yml`
  - runs on push to `main` and PRs to `develop` or `main`
  - validates typecheck, lint, format check, tests, and build on Node 22 and Node 24
- `release.yml`
  - runs on `v*.*.*` tag pushes
  - validates quality gates, checks version alignment, creates a GitHub release, and publishes to npm

### `scripts/`

Repository maintenance tooling.

- `copy-dts.js`: copies declaration-support files into `dist`
- `project-dump.mjs`: generates repository analysis artifacts under `.ai/`

### `.ai/`

Generated analysis output for repository inspection.

- Useful for audits and snapshots
- Not authoritative architecture documentation
- Must not be treated as the primary source of truth for governance

## Boundary Rules

- Runtime code in `src/` must not depend on test code, scripts, or generated output.
- Tests may depend on runtime source and test helpers only.
- Configuration files define tooling behavior but do not define runtime semantics.
- Documentation should describe the code and workflow, not replace them.

## Publish Surface

The npm package currently publishes only:

- `dist/`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `package.json`

Repository governance files are for maintainers and contributors; they are not part of the published runtime package.
