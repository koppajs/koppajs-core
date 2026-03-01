# Change Log

All notable changes to **@koppajs/koppajs-core** are documented in this file.

This project uses a **manual, tag-driven release process**.
Only tagged versions represent official releases.

This changelog documents **intentional milestones and guarantees**,
not every internal refactor.

---

## [Unreleased]

This section is intentionally empty.

Changes will only appear here when they:

- affect runtime behavior,
- change documented guarantees,
- or modify the public API surface.

---

## [3.0.1] — Badge & CI Fixes

**2026-03-01**

Patch release to fix README badges and CI configuration.
No runtime or API changes.

### Fixed

- License badge now uses static shield (avoids Shields.io cache issues)
- Bundle size badge replaced with static gzip size (removes Bundlephobia dependency)
- CI workflow now runs on push to `main` (enables build status badge)
- ESLint Prettier rule now passes explicit options (prevents formatting drift in CI)
- Added `.editorconfig` with `root = true`

---

## [3.0.0] — Baseline Runtime Release

**2026-03-01**

This release establishes the **stable runtime foundation of KoppaJS**.

It defines the final component model, lifecycle semantics, reactivity rules,
and architectural boundaries that KoppaJS is built upon.

From this version onward, the core runtime is considered **intentionally
defined and stable**, with changes happening only through explicit,
well-justified releases.

---

### Architecture

- Fully **class-free, factory-free, and virtual-DOM-free** runtime design
- Component system built directly on **native Web Components**
- No hidden lifecycle phases or implicit execution paths
- Clear separation of responsibilities across runtime modules
- Explicit teardown and cleanup semantics

---

### Component Model & Lifecycle

- Deterministic lifecycle with explicit hooks:
  - `created`
  - `processed`
  - `beforeMount`
  - `mounted`
  - `beforeUpdate`
  - `updated`
  - `beforeDestroy`
  - `destroyed`
- No implicit lifecycle execution
- Guaranteed cleanup of:
  - watchers
  - reactive effects
  - event listeners
- Predictable registration and destruction flow

---

### Reactivity & Data Flow

- Proxy-based reactive state model
- Referential prop binding (`:prop="state.value"`)
  - Parent and child share the same reference
  - Updates propagate through explicit observation
- No deep or implicit reactivity magic
- Rendering is triggered only by intentional, observable state changes

---

### Template & Rendering

- Inline template directives:
  - `loop`
  - `if` / `else`
  - `ref`
  - `slot`
- Text and attribute interpolation via `{{ expression }}`
- Declarative slot system for composition
- Direct DOM reconciliation (no virtual DOM diffing)

---

### Event System

- Custom event handling with:
  - bubbling support
  - scoped delegation
- Automatic listener cleanup on component destruction
- No global event leakage

---

### Typing & Contracts

- Strong typing throughout the runtime
- `satisfies`-based validation for internal structures
- Dedicated TypeScript configuration for public type generation
- Global type declarations (`globals.d.ts`, `kpa.d.ts`) intentionally provided
  for editor integration and DX
- Clear separation between public API contracts and internal implementation types

---

### Tooling & Quality

- pnpm-based project setup
- Deterministic dependency resolution via committed lockfile
- Vite-based build pipeline:
  - typecheck
  - bundle
  - type generation
- ESLint (flat config) and Prettier enforced
- Vitest test suite following the **KoppaJS “Three Test Rule”**

---

### Guarantees

Starting with `3.0.0`, the following guarantees apply:

- **Explicit runtime behavior**
- **No hidden global state**
- **Deterministic lifecycle execution**
- **Predictable reactivity and rendering**
- **Stability over feature velocity**

---

### Non-Goals

- No virtual DOM
- No implicit runtime magic
- No auto-registration side effects
- No framework-level convenience abstractions
- No hidden global mutations

---

## [0.0.0] — Initial Development Phase

Experimental and exploratory development phase.
No stability or API guarantees.
