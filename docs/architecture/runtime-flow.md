# Runtime Flow

## Overview

This document expands on `ARCHITECTURE.md` with the concrete runtime sequence used by the current implementation.

## 1. Registration Phase

- `Core.take(componentSource, name)` queues or immediately registers a component.
- `Core.take(pluginOrModule)` queues or immediately installs an extension.
- Before `Core()` runs, registrations are buffered in memory.
- After `Core()` runs, new registrations are applied immediately.

## 2. Core Initialization

Calling `Core()` performs one-time DOM bootstrapping:

- patch global event tracking
- extend `HTMLElement` with KoppaJS helpers
- start the global disconnection observer
- process the queued registrations

All of this is idempotent and browser-guarded.

## 3. Component Connection

When a registered custom element connects for the first time:

1. Resolve optional async dependencies from `ComponentSource.deps`.
2. Compile and execute the controller code with:
   - `$refs`
   - `$parent`
   - `$emit`
   - `$take`
   - any attached module variables
   - resolved dependency bindings
3. Create a reactive model from `controller.state`.
4. Process props from the host element into component state.
5. Bind methods and lifecycle hooks as required by component mode.
6. Attach modules and make plugin setup available through `$take`.
7. Create the runtime instance record and observer function.
8. Emit `created`.
9. Execute the initial render.
10. Emit `mounted` after the first successful render only.

## 4. Render Pipeline

Each render currently does the following:

1. Skip if the component is disconnected.
2. Skip if the reactive state version has not changed.
3. Clone the stored template.
4. Project slot content from the host into the fragment.
5. Process template directives and expressions.
6. Emit `processed`.
7. Bind native and structured events.
8. Flush model changes and attach `changedPaths` metadata for lifecycle hooks.
9. Emit either:
   - `beforeMount` on the first render
   - `beforeUpdate` on later renders
10. Reconcile the processed fragment into the host DOM.
11. Emit `updated` on non-initial renders.
12. Clear transient metadata and record the last rendered state version.

If rendering is already in progress when another update arrives, the runtime records a pending render and runs it later.

## 5. Update Scheduling

- The reactive model batches observer notifications with `queueMicrotask`.
- The component observer schedules rendering with `requestAnimationFrame`.
- If `watchList` exists, only matching path changes trigger re-render.
- Child components suppress self-renders while an ancestor is actively rendering to avoid redundant work.

## 6. Identity Handling

Two identity systems matter during updates:

- Structural identity on custom elements via `structAttr` and non-enumerable struct IDs
- Loop slot identity on reactive arrays via slot-sidecar IDs

Together they allow `reconcileDOM()` to preserve custom element instances across reorders and repeated renders.

## 7. Disconnect And Teardown

When a component disconnects:

1. Mark the instance disconnected and abort pending renders.
2. Remove the model observer.
3. Emit `beforeDestroy`.
4. Clean up tracked subtree listeners.
5. Clean up listeners added through structured event setup.
6. Remove the component style if no more instances of that tag remain.
7. Emit `destroyed`.
8. Release strong references for garbage collection.

Reconnect during async teardown is guarded so the runtime can abort destructive cleanup when the instance becomes active again.

## 8. Component Modes

### `options`

- Creates `userContext` by composing methods and state
- Binds methods and lifecycle hooks to `userContext`
- Template expressions can use methods through the same composed context

### `composite`

- Keeps state and methods separate
- Avoids implicit `this` binding
- Uses direct method access for native event wiring

Any future change to these semantics requires an ADR because it affects user-facing component behavior.
