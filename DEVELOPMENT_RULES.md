# Development Rules

## Scope

These rules apply to all runtime code, tests, build configuration, and repository maintenance work
in this repository.

## Design Rules

- Prefer explicit functions and direct control flow over abstract orchestration layers.
- Keep the runtime small and browser-native. This repository should remain a runtime core, not a general application framework.
- Favor contract-driven changes. If a change affects public behavior, document the contract first.
- Optimize for readability and debuggability before cleverness.

## File And Module Rules

- `src/index.ts` is the public runtime entry point. New public exports should be added deliberately and documented.
- `src/types.ts` is the public type anchor. Public type additions and ambient changes belong there unless there is a strong reason otherwise.
- `src/component.ts` owns component lifecycle orchestration. Do not reimplement connect or render orchestration elsewhere.
- `src/model.ts` owns proxy semantics, watcher behavior, state versioning, and slot-sidecar identity behavior.
- `src/utils/reconcile.ts` owns DOM preservation and custom-element reconciliation semantics.
- `src/utils/script.ts` is the only approved location for runtime dynamic code generation.
- `test/` should mirror the runtime behavior being changed. Prefer placing regression tests next to the affected subsystem area.

## Allowed Patterns

- Small focused helpers with narrow responsibilities.
- `WeakMap`-based caches or sidecars when identity must follow object lifetime.
- Guarded use of browser globals (`document`, `window`, `MutationObserver`, `HTMLElement`, and similar).
- In-place object and array updates when reference preservation is part of the runtime contract.
- `requestAnimationFrame` for render scheduling and `queueMicrotask` for batched observer delivery where already established.

## Forbidden Or Restricted Patterns

- No virtual DOM introduction without an ADR.
- No hidden global mutable state beyond explicit registries and caches already documented.
- No new `eval` or `new Function` usage outside `src/utils/script.ts` without an ADR.
- No silent changes to lifecycle ordering, directive semantics, extension contracts, or public typings.
- No runtime dependency additions without architectural justification and documentation.
- No cross-imports from runtime code into test helpers, scripts, coverage output, or generated artifacts.

## Public API Rules

Treat all of the following as compatibility-sensitive:

- exports from `src/index.ts`
- `ComponentSource`
- `Core.take()` behavior
- lifecycle hook names and timing
- plugin and module interfaces
- HTMLElement global augmentations
- `.kpa` ambient module typing

Changes to these areas require:

- a spec when behavior changes
- an ADR when the architecture or compatibility story changes
- tests covering both normal and edge behavior
- documentation updates in the same change

## Code Style Rules

- Use TypeScript strict-mode compatible code.
- Prefer `logger` over scattered console logging. Low-level fallback logging should be rare and justified.
- Keep comments brief and useful. Explain invariants or tricky behavior, not obvious syntax.
- Preserve existing file naming conventions. Runtime files are in lowercase kebab-case.
- Keep helper APIs narrow; avoid exporting internals just to simplify tests.
- When an invariant matters, encode it in code and in tests.

## Dependency Rules

- Production runtime code should stay dependency-light and preferably dependency-free.
- Dev-only tooling can be added when it materially improves quality, release safety, or documentation maintenance.
- Build or release tooling changes must be reflected in `docs/quality/quality-gates.md` and, if contributor-facing, `CONTRIBUTING.md` or `RELEASE.md`.

## Documentation Rules

- Update `ARCHITECTURE.md` when subsystem responsibilities or runtime flow changes.
- Update `TESTING_STRATEGY.md` when test philosophy, coverage expectations, or test levels change.
- Update `AI_CONSTITUTION.md` and `.github/instructions/ai-workflow.md` when AI collaboration rules change.
- Add an ADR for any material architectural decision, reversal, or exception.
- Add or update a spec before implementing public-facing behavior changes.

## Definition Of A Safe Change

A change is safe to merge only when:

- the implementation matches the governing spec and ADRs
- the changed behavior is tested at the correct level
- lower-precedence docs are updated to match higher-precedence docs
- contributor workflow instructions still reflect the repository as it exists now

## Documentation Contract Rules

- `README.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, and `CONTRIBUTING.md` are governed by [docs/specs/repository-documentation-contract.md](./docs/specs/repository-documentation-contract.md).
- If one of those files changes shape, update the spec and `scripts/check-doc-contract.mjs` in the same change.
- Keep official KoppaJS branding, logo usage, and closing governance sections consistent across the governed root documents.
