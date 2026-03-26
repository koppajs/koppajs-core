# ADR-0001: Native DOM And Custom Elements

- Status: Accepted
- Date: 2026-03-12

## Context

KoppaJS core is intended to be a lightweight browser runtime. The repository already centers its
component model on native custom elements, direct DOM manipulation, slot projection, and custom
element-aware reconciliation. That architectural choice needed to be recorded explicitly because it
shapes lifecycle behavior, performance tradeoffs, testing strategy, and compatibility expectations.

## Decision

The core runtime will remain platform-first:

- components are registered as native custom elements
- rendering is performed against real DOM fragments
- updates are applied through targeted DOM reconciliation
- the project does not use a virtual DOM layer

This decision also implies that lifecycle is anchored to browser connection and disconnection events, not to an abstract renderer.

## Consequences

- The runtime stays small and direct, with behavior that maps closely to the browser platform.
- Tests can verify most behavior in JSDOM without simulating a separate rendering engine.
- DOM identity and teardown correctness become first-class concerns.
- SSR-like behavior, if ever introduced, must be carefully designed because the current architecture is browser-centric.
- Any move toward a virtual DOM or synthetic component lifecycle now requires a new ADR.

## Alternatives considered

- Virtual DOM diffing
  - Rejected because it would add an architectural layer the project explicitly avoids and would change the cost model and lifecycle semantics.
- Class-based component hierarchy
  - Rejected because the runtime already prefers explicit contracts and platform-native custom elements over framework-managed object hierarchies.
