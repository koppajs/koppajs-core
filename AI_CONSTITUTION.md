# AI Constitution

## Purpose

This document defines how humans and AI agents are expected to change `@koppajs/koppajs-core`.
It is the collaboration contract for architectural work, code changes, tests, and documentation.

This repository is the KoppaJS runtime core. Its job is to remain small, explicit, predictable,
and compatible with the rest of the KoppaJS ecosystem.

## Core Principles

- Platform first. Prefer native Web Components, DOM APIs, and browser primitives over framework-style abstraction.
- Explicit contracts over hidden behavior. Public behavior must be traceable to documented contracts such as `Core`, `ComponentSource`, lifecycle hooks, plugin/module interfaces, and documented directives.
- Preserve runtime simplicity. Avoid introducing new layers unless they remove real complexity in the codebase.
- Protect compatibility. Public API changes, lifecycle changes, directive changes, and changes to the core/plugin contract are architecture-level decisions.
- Keep state identity intentional. The runtime relies on in-place updates, proxy semantics, and loop identity tracking to preserve behavior.
- Documentation is part of the system. Architecture and governance docs must evolve with the code.

## Required Read Order Before Editing

1. Read `DECISION_HIERARCHY.md`.
2. Read `ARCHITECTURE.md`.
3. Read any relevant documents in `docs/adr/`, `docs/specs/`, and `docs/architecture/`.
4. Read `DEVELOPMENT_RULES.md` and `TESTING_STRATEGY.md`.
5. Read the source files and tests that will be touched.

Skipping this sequence is only acceptable for trivial typo-only changes.

## Rules For AI-Assisted Changes

- Follow `spec -> tests -> implementation` for any behavior change, public API change, or architectural change.
- Prefer existing patterns over inventing new abstractions. In this repository, that means explicit functions, targeted utilities, and contract-driven runtime behavior.
- Never silently change:
  - `Core` initialization or registration semantics
  - `ComponentSource` fields or meaning
  - lifecycle hook names or ordering
  - directive semantics such as `loop`, `if`, `else`, `slot`, `ref`, and interpolation behavior
  - plugin or module interfaces
  - exported ambient typings in `src/types.ts`, `src/globals.d.ts`, or `src/kpa.d.ts`
- Treat `src/utils/script.ts` as the only allowed boundary for dynamic runtime code generation. Do not spread `eval` or `new Function` usage elsewhere without an ADR.
- Treat `.ai/`, `dist/`, and `coverage/` as generated artifacts. They can inform analysis, but they are not authoritative project governance.
- Update relevant docs in the same change whenever behavior, architecture, workflow, or quality expectations change.
- Prefer additive clarification over vague prose. If a rule is important, make it explicit.

## Architecture-Specific Guardrails

- Do not introduce a virtual DOM, hidden render scheduler, or factory-heavy component layer without an ADR.
- Do not break the distinction between `options` and `composite` component modes without a spec and ADR.
- Do not add runtime package dependencies casually. New runtime dependencies require architectural justification.
- Guard browser-only APIs so the package remains safe to import in non-DOM environments.
- Preserve teardown correctness. Event cleanup, observer cleanup, and disconnect behavior are core invariants.

## Definition Of Done

A change is not complete until all of the following are true:

- The code, tests, and docs agree.
- Relevant specs and ADRs are created or updated when the change alters behavior or architecture.
- New or changed behavior is covered by tests at the correct level.
- Contributor-facing workflow docs still reflect reality.
- Lower-priority documents are updated to match higher-priority ones per `DECISION_HIERARCHY.md`.

## Self-Evolution Rules

Whenever any of the following changes, update the meta layer in the same work item:

- New subsystem or module boundary -> update `ARCHITECTURE.md` and the relevant file in `docs/architecture/`.
- New architectural pattern or exception -> add or update an ADR in `docs/adr/`.
- New public behavior or compatibility promise -> create or update a spec in `docs/specs/`.
- New coding convention or dependency rule -> update `DEVELOPMENT_RULES.md`.
- New test expectations or CI gate -> update `TESTING_STRATEGY.md` and `docs/quality/quality-gates.md`.
- New AI workflow expectation -> update this file and `.github/instructions/ai-workflow.md`.
- Workflow or release changes -> update `CONTRIBUTING.md`, `RELEASE.md`, and quality docs as needed.

If a change cannot be explained in the meta layer, the change is not ready to merge.
