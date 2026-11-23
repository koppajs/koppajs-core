# Testing Strategy

## Purpose

The test suite exists to protect runtime behavior, compatibility, and architectural invariants of
the KoppaJS core runtime. Tests are not only for correctness; they are also the executable guardrail
for lifecycle order, reactive identity, DOM preservation, teardown safety, and public contracts.

## Current Test Stack

- Vitest 5
- JSDOM test environment
- V8 coverage reporting
- Shared setup in `test/setup.ts`
- Coverage collected from `src/**/*.ts`, excluding ambient typings and `src/types.ts`

## Test Philosophy

- Prefer behavior-driven tests over implementation-detail tests.
- Follow the existing "Three Test Rule" as a minimum shape for non-trivial behavior:
  - valid case
  - error or invalid case
  - edge case
- Add regression tests for every bug fix that changes behavior.
- Protect invariants explicitly when the runtime depends on them, especially around reactivity, loops, lifecycle order, and cleanup.

## Test Pyramid For This Repository

### Unit Tests

Use unit tests for:

- pure helpers
- type guards
- logger behavior
- composition helpers
- reactive model behavior that can be isolated from component rendering
- template expression parsing and watch-list extraction helpers
- identity and hook registry helpers

These tests should be fast, explicit, and avoid broad fixture setup.

### Integration Tests

Use integration tests for:

- custom element registration
- component connect, render, update, and disconnect flows
- prop processing and parent-child interaction
- slot processing
- event binding and teardown
- DOM reconciliation behavior
- plugin and module integration
- global event cleanup behavior

Most of the value in this repository comes from integration tests because the runtime behavior is a coordinated system.

### Packed-Package Consumer Tests

`pnpm test:package` builds the library and runs `test/package-consumer.test.mjs`
with Node's test runner. It packs the actual publish payload, installs the local
tarball offline in a temporary consumer and launches native `.mjs` and `.cjs`
processes by package name. A separate check loads the packed legacy `main` target.
The import-safety cases expose callable `Core` and `Core.take` without DOM globals.
Separate ESM/CJS consumers use JSDOM to mount both precompiled and string-script
components from the installed tarball, including events, teardown and reinitialization.
A strict TypeScript consumer checks the packed factory declarations with Bundler resolution.
No runtime source imports, Vitest transforms or module mocks are allowed at this boundary.

CI runs these checks on Node 22 and 24. After a build, additional local runtimes
can run `node --test test/package-consumer.test.mjs` directly. Temporary consumer
files and tarballs are removed after the tests. This gate validates runtime
entrypoints and the typed factory contract; it does not promise NodeNext declaration
compatibility or cross-format singleton identity.

### Real-Browser CSP Contract Test

After a fresh `pnpm build`, run `node --test test/browser-csp.test.mjs`. This targeted
Node test uses a real Chrome/Chromium browser through WebSocket/CDP, a loopback HTTP server,
and a temporary browser profile, with server/profile cleanup. Set `CHROME_BIN` to the browser
executable or use a standard Chrome/Chromium installation path. No additional dependencies
are needed. A missing browser is an environment blocker, not passing CSP evidence.

The fixture loads built package output under `script-src 'self'`, without `unsafe-eval`.
It exercises a precompiled controller with a static template and structured function events.
The legacy string-script path is the negative control. The separate `style-src 'self' 'unsafe-inline'`
allowance permits runtime styles; this proves the controller execution boundary, not
strict style CSP support or dynamic template expression compatibility.

For manual inspection after building, run `node test/browser-csp-server.mjs` and open
`http://127.0.0.1:4178/`. Confirm the precompiled example and its event interaction work.
Open `http://127.0.0.1:4178/?legacy=1` for the CSP-blocked string-script negative control.
Stop the server when finished. JSDOM integration coverage and mocked `Function` failures
complement this check but do not prove browser CSP enforcement.

### End-To-End Tests

The CSP contract test is a narrow browser boundary, not a full toolchain E2E suite.
Broader application E2E coverage belongs in:

- the example application repository
- plugin repositories
- documentation or starter repositories that exercise the full toolchain

Do not try to replace missing E2E coverage here with brittle implementation-detail tests.

## Mocking Policy

- Prefer real JSDOM DOM behavior over mocking DOM APIs.
- Avoid global mocks unless the alternative is impractical.
- Logger suppression in test setup is acceptable because it keeps failure output readable.
- Mock only true external boundaries or intentionally isolated collaborators.

## Coverage Expectations

- CI runs `pnpm test:ci`, which includes coverage collection.
- This repository does not currently enforce numeric coverage thresholds in config.
- Even without a hard gate, contributors are expected to maintain or improve effective coverage in critical runtime paths.
- Changes to `src/component.ts`, `src/model.ts`, `src/template-processor.ts`, `src/event-handler.ts`, `src/global-event-cleaner.ts`, `src/utils/reconcile.ts`, or `src/types.ts` should almost always include new or updated tests.

Coverage numbers are advisory. Behavioral coverage of important contracts is the real goal.

## Required Test Moves By Change Type

- Public API change -> add or update unit and integration coverage around the exported contract.
- Precompiled controller change -> cover priority, synchronous return validation, failure without
  fallback, resolved dependencies, live refs/modules, lifecycle, and teardown in integration
  tests; run the real-browser CSP contract test against a fresh build.
- Lifecycle or render change -> add integration tests covering first mount, update, and teardown where relevant.
- Reactive model change -> add direct model tests and at least one integration test if component rendering depends on the change.
- Directive or template behavior change -> add template-processor tests and component-level confirmation if user-visible.
- Build or release workflow change -> validate scripts and CI behavior; update quality docs.

## Preferred Change Order

1. Update or create the relevant spec in `docs/specs/` when behavior changes.
2. Add or update tests to describe the intended behavior.
3. Implement the code change.
4. Run the narrowest useful local verification first, then broader verification if the change is wide.

## Release And CI Gates

The repository quality gates currently include:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm format:check`
- `pnpm test:ci`
- `pnpm test:package` (includes build and packed-package consumer checks)

These gates are enforced in GitHub Actions and should pass locally before release work.
The separate local CSP gate is `pnpm build` followed by
`node --test test/browser-csp.test.mjs`; it is not included in the commands above.
Record its actual browser result separately rather than inferring it from JSDOM or package tests.
