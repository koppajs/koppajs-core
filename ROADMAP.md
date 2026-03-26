# Roadmap

## Purpose

This roadmap records the intended direction of the KoppaJS core runtime. It is not a promise of exact delivery dates. It is the prioritized direction for maintenance and evolution.

## Current Priorities

### 1. Runtime Contract Stability

- Keep the `Core`, `ComponentSource`, lifecycle, directive, and extension contracts explicit and documented.
- Reduce ambiguity between the core runtime and the Vite plugin boundary.
- Record major architecture decisions as ADRs instead of leaving them implicit in source code.

### 2. Runtime Hardening

- Expand regression coverage around reconnect behavior, teardown safety, and DOM reconciliation identity.
- Continue hardening proxy-based state behavior, especially array mutation and loop identity handling.
- Preserve predictable behavior between `options` and `composite` component modes.

### 3. Meta Layer Maintenance

- Keep architecture, specs, testing strategy, and AI workflow instructions aligned with the codebase.
- Require meta-layer updates whenever architecture or workflow changes.
- Continue converting implicit runtime assumptions into explicit specs or ADRs.

### 4. Ecosystem Alignment

- Keep this repository aligned with the KoppaJS Vite plugin and example project.
- Support the broader KoppaJS roadmap already reflected in the public README:
  - official documentation site
  - official plugins
  - ecosystem growth
  - editor tooling

## Non-Goals Without A New ADR

The following are intentionally out of scope unless a future ADR changes direction:

- introducing a virtual DOM
- growing this package into a full application framework or CLI
- adding runtime dependencies without a clear architectural need
- making undocumented compatibility changes to the core/plugin contract

## Review Rule

Review this roadmap whenever:

- a new subsystem is added
- public contracts change
- release or quality gates change
- an ADR materially changes project direction
