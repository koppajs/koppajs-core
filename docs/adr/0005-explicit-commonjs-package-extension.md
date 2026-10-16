# ADR 0005: Explicit CommonJS Package Extension

- Status: Proposed

## Context

The package declares `"type": "module"` but Vite previously emitted CommonJS
`exports` assignments in `dist/index.cjs.js`. Native Node treats that `.js` file
as ESM. Both `exports.require` and legacy `main` selected the invalid entrypoint.
Source-level Vitest tests do not exercise the installed package's loader boundary.

## Decision

Emit CommonJS as `dist/index.cjs` and point `exports.require` and `main` at it.
Keep `dist/index.es.js`, `exports.import`, `module`, the package type and the named
runtime exports unchanged. Do not expose or retain the erroneous filename as a
package subpath. Enforce the contract with real packed-package consumers on the
Node 22 and 24 CI matrix and before release publication. Rebuild normal pack and
publish output through `prepack` so stale artifacts are not silently shipped.

## Consequences

Existing package-name imports retain their syntax and receive the correct loader
format. Unsupported direct filesystem references to `dist/index.cjs.js` must use
the package entrypoint instead. Two bundles still have independent module state;
this fix does not promise singleton identity across ESM and CommonJS. Declaration
paths remain unchanged; CommonJS-specific declaration packaging is outside this
runtime-loader fix. Package validation needs local npm, pnpm and temporary disk
space, but does not need registry access or additional runtime dependencies.

## Alternatives considered

- Change the root package type to CommonJS: would invalidate the existing ESM
  `.js` entry and change the interpretation of repository tooling.
- Add a nested CommonJS package scope: adds packaging complexity just to preserve
  an erroneous internal filename and requires moving the ESM bundle or its scope.
- Point `require` at the ESM bundle: relies on newer Node ESM interoperability and
  does not provide a real CommonJS entry on the declared Node >= 22 baseline.
