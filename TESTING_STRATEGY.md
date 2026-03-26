# Testing Strategy

## Purpose

The test suite exists to protect runtime behavior, compatibility, and architectural invariants of
the KoppaJS core runtime. Tests are not only for correctness; they are also the executable guardrail
for lifecycle order, reactive identity, DOM preservation, teardown safety, and public contracts.

## Current Test Stack

- Vitest 4
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

### End-To-End Tests

This repository does not currently host browser-level end-to-end tests. E2E coverage belongs in:

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
- `pnpm prettier --check . --config config/prettier.config.mjs --ignore-path config/.prettierignore`
- `pnpm test:ci`
- `pnpm build`

These gates are enforced in GitHub Actions and should pass locally before release work.
