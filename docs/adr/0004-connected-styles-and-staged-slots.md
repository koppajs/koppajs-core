# ADR 0004: Connected Styles And Staged Slots

- Status: Accepted

## Context

A parent can insert a custom element with already visible light-DOM slot content.
Waiting for dependency imports before inserting the child's CSS exposes that content
without its component styles. Moving live slot nodes into a detached fragment before
asynchronous processing can also leave the host empty across browser frames.

## Decision

Insert shared per-tag CSS synchronously on connect, before imports. Track connected
hosts within each registered definition, including hosts with pending initialization.
Remove CSS synchronously on the last disconnect; registration alone inserts no CSS.
Use connection versions to invalidate obsolete asynchronous initialization and commits.

Process slot content on detached copies with a mapping to the original nodes. After
asynchronous render hooks finish, transfer processed attributes, text and child layout
to the originals, remap refs, bind events, and reconcile without another await. Existing
custom elements retain their own children. Original node identity and external listeners
are preserved. After processing, slot refs are remapped to the live originals before render hooks.
The commit applies only processing changes, preserving unrelated hook modifications. No new public readiness API or visibility rule is introduced.

## Consequences

Slot preparation uses temporary DOM copies. Templates without slots avoid this cost.
CSS exists only while connected hosts need it. This closes the CSS timing gap but does
not make router outlet replacement atomic or prevent layout changes in user mount hooks.
Lifecycle event names and ordering remain unchanged; event binding moves after async
beforeMount/beforeUpdate hooks so it targets committed slot nodes.

## Alternatives considered

- Retain styles permanently: violates the last-instance cleanup contract.
- Hide every initializing host: can replace unstyled content with a blank area.
- Move live slots before processing: exposes an empty intermediate host across awaits.
- Commit cloned slots: loses original nodes, external listeners, and component instances.
