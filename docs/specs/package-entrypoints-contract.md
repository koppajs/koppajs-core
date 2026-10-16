# Spec: Package Entrypoints Contract

- Status: Draft
- Owner: KoppaJS core maintainers

## Scope

The built and packed `@koppajs/koppajs-core` package must expose the public runtime
through native Node ESM and CommonJS resolution on Node.js >= 22.

## Behavior

- Keep the package scope as `"type": "module"`.
- ESM `import { Core } from '@koppajs/koppajs-core'` resolves through
  `exports.import` to `dist/index.es.js`.
- CommonJS `require('@koppajs/koppajs-core').Core` resolves through
  `exports.require` to `dist/index.cjs`. The `.cjs` extension explicitly selects
  CommonJS even inside a module package scope.
- Legacy `main` points to the same CommonJS file; `module` retains the ESM path.
- Both entrypoints expose `Core` and `Core.take` as functions without requiring
  browser globals merely to load the package.
- Build output and package metadata must agree. Ordinary packing rebuilds the
  output via `prepack`; package tests pack an already freshly built tree with
  lifecycle scripts disabled to avoid recursive builds.

## Constraints

- Preserve the package name, ESM filename, named runtime API and declaration path.
- Do not add runtime dependencies or a second nested package scope.
- The erroneous `dist/index.cjs.js` path is not retained: it was not an exported
  package subpath, and a CommonJS file with that name remains invalid in this scope.
- ESM and CommonJS are separate bundles; cross-format singleton identity is not
  guaranteed. This change does not redesign declaration resolution for CommonJS.

## Edge Cases

- Consumers outside the repository must resolve the installed package by name,
  not import source files or rely on Vite/Vitest transforms.
- Legacy consumers that bypass `exports` must receive a working `main` target.
- Package tests must use fresh Node processes without DOM shims or loader flags.

## Acceptance Criteria

- A real local tarball installs offline in an isolated consumer directory.
- Native ESM, native CommonJS and direct legacy-main consumers each observe
  `typeof Core === 'function'` and `typeof Core.take === 'function'`.
- The same consumer checks pass in the Node 22 and Node 24 CI matrix.
- Packaging checks run before release publication; no version bump or release is
  implied by running local validation.

## Test Plan

- `pnpm test:package` builds, packs and installs the tarball, then runs consumers
  using the current Node executable.
- Run the consumer test with available supported Node executables after building
  to verify compatibility without rebuilding under each runtime.
