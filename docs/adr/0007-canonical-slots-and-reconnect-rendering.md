# ADR 0007: Canonical Slots And Reconnect Rendering

- Status: Accepted
- Date: 2026-10-31

## Context

The BWS consumer exposes two lifecycle defects: updating or reinitializing a slotted
primitive can project its generated wrapper as new slot content, and reconnecting
an aborted first render can leave a host under first-presentation protection.
Document dimensions can remain stable while primitives are hidden or nested.

## Decision

Retain the original caller slot nodes on the host across render attempts, updates,
and completed teardown/reinitialization. Stage those nodes without detaching them
before commit. Do not recapture the generated template as caller content. This is
host-owned DOM identity, not a second controller or retained reactive model.

Keep an instance-local render continuation available before created hooks yield.
Every render path waits for the same created-hook promise before its first successful
commit. A reconnect resumes that render through the existing rendering lock and
pending-render mechanism. Render attempts check connection ownership at async
boundaries; obsolete attempts cannot publish or complete readiness.

## Consequences

- Reactive updates and reconnects retain one template layer and original slot identity.
- First-presentation guards terminate only at a current successful commit or cleanup.
- Completed teardown still removes observers, events, controller references and CSS.
- Only slot-bearing templates retain caller-owned slot nodes, not generated wrappers.
- Capture includes children supplied after connection but before the first render attempt;
  arbitrary later light-DOM replacement is not introduced as a dynamic slot API.
- Native declarative binding names remain node-owned metadata after consumed attributes
  disappear; rebind to a new controller once after cleanup, without retaining old contexts.
  Stop traversal below nested custom-element hosts so parent rebinds cannot steal child handlers.
- No new public API, dependency, timer budget, or descendant readiness barrier is added.
- Runtime integration tests cover update, aborted first-render reconnect and completed
  teardown; real-browser consumer checks remain authoritative for visible rendering.

## Alternatives considered

- Recapture host children every render: includes generated wrappers and compounds padding.
- Keep every controller forever on disconnect: changes teardown and memory ownership.
- Force opacity or unwrap component markup in the consumer tests: hides runtime failures.
- Wait a fixed delay or accept new snapshots of incomplete mounts: proves no lifecycle contract.
