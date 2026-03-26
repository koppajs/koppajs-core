# Meta Layer

## What This Is

The meta layer is the repository's architecture memory and governance system.
It explains how the KoppaJS core runtime is built, how decisions are recorded, and how maintainers and AI agents are expected to work.

## Initial Audit Summary

This meta layer was established after auditing the repository on 2026-03-12.
At that point the repository already had:

- contributor guidance
- release instructions
- CI workflows
- a strong automated test suite

It did not yet have a structured architecture memory system with:

- a formal decision hierarchy
- ADRs
- specs
- explicit AI workflow rules
- a repository map tied to actual module boundaries

This directory and the related root governance files close that gap.

## Document Map

- `ARCHITECTURE.md`: high-level runtime architecture and invariants
- `docs/architecture/runtime-flow.md`: detailed runtime execution flow
- `docs/meta/repository-map.md`: folder and module responsibilities
- `docs/adr/`: architecture decision records
- `docs/specs/`: behavior specifications
- `docs/quality/quality-gates.md`: CI, release, and contributor quality gates

## Tooling Boundaries

This repository intentionally uses a compact quality stack:

- ESLint for code-quality rules
- Prettier for formatting
- Vitest with JSDOM for unit and runtime-integration tests
- Husky, lint-staged, and commitlint for lightweight commit-time safeguards

It intentionally does not use:

- Playwright, because this repository is a runtime/core package without a repository-local end-user UI
- Stylelint, because there is no standalone CSS/SCSS/PostCSS asset layer to lint at the repository level

## Maintenance Triggers

Update the meta layer whenever any of the following changes:

- public APIs or controller contracts
- runtime flow or lifecycle semantics
- module boundaries or file responsibilities
- testing philosophy or CI gates
- contributor workflow or release process
- AI collaboration expectations

## Minimum Maintenance Checklist

Before merging an architecture-affecting change:

1. Check whether a spec is needed or must be updated.
2. Check whether an ADR is needed or must be updated.
3. Update architecture and repository-map docs.
4. Update testing and workflow docs if verification or contributor steps changed.
5. Confirm lower-precedence documents match `DECISION_HIERARCHY.md`.

## Review Cadence

- Per change: for any architecture, workflow, or public-behavior change
- Periodic audit: at least once per quarter, or before any significant release cycle
