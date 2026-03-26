# ADR-0002: Proxy Reactivity With Array Identity Sidecars

- Status: Accepted
- Date: 2026-03-12

## Context

The runtime already depends on a proxy-based model for state observation. It also preserves array
references across replacement-style updates and tracks loop identity through slot-sidecar metadata.
These behaviors are subtle but central to the current rendering and reconciliation model, especially
for loops and child preservation.

## Decision

The core runtime will continue to use:

- proxy-based reactive state
- batched observer notification
- in-place object and array updates where identity preservation matters
- slot-sidecar identifiers on reactive arrays to preserve loop identity across structural mutations

The model layer in `src/model.ts` is the canonical owner of these semantics.

## Consequences

- Component code can rely on stable object and array references in important update paths.
- DOM reconciliation can preserve looped custom elements more reliably.
- Array mutation logic is more complex and must be protected with focused tests.
- Any shift toward immutable replacement semantics would be a major architectural change and requires a new ADR.

## Alternatives considered

- Immutable state replacement for all changes
  - Rejected because it would break current reference-preservation assumptions and require a different reconciliation and binding strategy.
- Loop identity handled entirely in the DOM layer
  - Rejected because identity is created by data mutation semantics first, then consumed by the DOM layer.
