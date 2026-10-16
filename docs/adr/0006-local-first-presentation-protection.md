# ADR 0006: Local First Presentation Protection

- Status: Accepted

## Context

ADR 0004 makes shared component CSS available before asynchronous initialization and
stages slot processing without disconnecting originals. CSS availability alone does
not protect slot HTML whose presentation depends on wrappers in the unfinished template.
Moving originals off-DOM before asynchronous work would introduce extra disconnects,
initialization races and loss of useful layout measurements for connected slot elements.

## Decision

Retain detached slot staging and protect the first presentation of every unrendered host,
including initially empty hosts whose parser/caller children arrive after connection.
Before the first await, temporarily set host opacity to zero and
suppress opacity transitions through `transition-property: none`, both inline with
important priority. This protects the host as a unit, including text and defined custom
elements, without changing descendant display, visibility, form state or connection.

Restore the saved declarations in the same synchronous turn as the successful local
slot transfer, event binding and reconciliation. Do not await descendants, external
stylesheets, router readiness, a timeout or a fixed number of frames. A pending child
protects its own first presentation. Shared component CSS remains synchronous on connect.
Only restore declarations still owned by the guard, preserving later explicit author
writes. Author code must not override the temporary host opacity while initialization
is pending. Hosts using `display: contents` have no composited host box and are outside
this opacity-based presentation guarantee.

A superseded attempt retains protection for its replacement. First mount and readiness
are reported only by a successful render, not by the outer initialization continuation.
Track successful DOM publication separately from the shared mount-completion promise. Await
mount hooks outside the render lock so they can await reactive DOM updates. Disconnect and
terminal initialization/render errors release temporary declarations. Errors are logged;
error fallback DOM is not a successful presentation and may expose original content.
The runtime does not invent a fallback template or retain invisible failed hosts forever.

The global removal observer must not clean listeners on nodes already reconnected when
its records are delivered. The synchronous slot transfer is a move, not final removal.
Explicit component teardown and truly disconnected subtree cleanup remain unchanged.

## Consequences

- Connected slot nodes, listeners, form values and refs survive preparation and commit.
- Preparation adds no custom-element connection/disconnection callbacks. The existing
  synchronous transfer at commit can still reconnect slot custom elements.
- Layout measurement remains possible. A local blank region while asynchronous work is
  pending is expected; this decision prevents raw layout, not rendering latency.
- Author opacity and transition declarations (including priorities) are restored, and
  intentionally hidden descendants remain hidden. User animations remain consumer-owned.
- Inline presentation mutation is observable to controllers and DOM observers. This is
  a local first-render guard, not a public readiness attribute or global visibility rule.
- No router, plugin payload, public API or runtime dependency changes are needed.

## Alternatives considered

- Early removal of original slots: conflicts with connected-slot lifecycle and measurement.
- Router ready/commit barrier: postpones route replacement and couples unrelated components.
- Hiding every child with display rules: breaks layout measurements and author hiding rules.
- `:not(:defined)`: does not cover defined components awaiting asynchronous processing.
- Fixed delays or frame counts: cannot prove completion of processing or hooks.
