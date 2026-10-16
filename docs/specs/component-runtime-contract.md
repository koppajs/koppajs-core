# Spec: Component Runtime Contract

- Status: Approved
- Owner: KoppaJS core maintainers
- Last updated: 2026-03-12

## Summary

This spec defines the intended runtime behavior of component registration, initialization, rendering,
updating, and teardown in `@koppajs/koppajs-core`.

It is the normative behavior contract for the component runtime as implemented today.

## Inputs

- `Core.take(componentSource, name)`
- `Core.take(pluginOrModule)`
- `Core()`
- `ComponentSource` objects containing at least `template`, `script`, and `style`
- host element attributes and child nodes
- reactive state mutations

## Outputs

- registered custom elements
- rendered host DOM content
- bound lifecycle hooks
- component instance state and references
- cleaned-up listeners and observers on disconnect

## Behavior

### Registration

- `Core.take(componentSource, name)` must register a component definition by custom-element name.
- `Core.take(pluginOrModule)` must install an extension definition.
- Registrations made before `Core()` are queued and processed during initialization.
- Registrations made after `Core()` are applied immediately.

### Initialization

- `Core()` must be safe to call multiple times.
- DOM setup must run once and only in browser-capable environments.
- Initialization must process all queued registrations in order.

### First Connection

When a registered component connects for the first time, the runtime must:

Before any asynchronous initialization, insert the shared per-tag stylesheet synchronously.
Registration alone must not insert CSS. Track connected hosts, including those still resolving
dependencies; remove CSS synchronously when the last host disconnects. An obsolete connection
must not resume initialization, commit DOM, or emit `mounted` after disconnect.

1. resolve `ComponentSource.deps` if present
2. execute the controller code
3. create reactive state from `controller.state`
4. process props into state
5. attach modules and make plugins available through `$take`
6. register lifecycle hooks
7. render the template into the host
8. emit `created`
9. emit `mounted` only after the first successful render

### Component Modes

- `options` mode must expose composed state and methods through `userContext` and bind lifecycle hooks and methods to that context.
- `composite` mode must not rely on implicit `this` binding and must keep state and methods separate.

### Updates

- State mutations must notify observers in a batched manner.
- Re-renders must be skipped when no relevant state version change exists.
- If `watchList` is present, only matching path-prefix changes should trigger re-render.
- Rendering while a render is already active must schedule a follow-up render instead of running re-entrantly.
- Child components should not self-render while an ancestor render is already applying updates that will refresh their props.

### Rendering

Each render must:

- clone the stored template
- protect the host's first presentation synchronously before dependencies or hooks can yield, including hosts whose children arrive after connection
- prepare host slot content without removing live nodes during asynchronous work
- keep original slot nodes connected and measurable, but suppress host painting until the first successful local DOM commit; do not wait for descendants or route readiness
- restore author presentation declarations at commit, disconnect, or terminal initialization/render failure; a failed render does not emit mounted or resolve readiness
- process directives and interpolation
- bind events
- flush changed paths for lifecycle metadata
- emit `beforeMount` on first render or `beforeUpdate` on later renders
- transfer processed slot content to the original nodes immediately before DOM reconciliation, preserving node identity and existing listeners
- reconcile the processed DOM into the host without unnecessarily destroying preserved custom elements
- emit `updated` only for non-initial renders

### Identity

- Structural identity for custom elements must be preserved through the documented reconciliation mechanism.
- Reactive arrays used in loops must preserve stable slot identity across structural mutations.
- Full array replacement must preserve the live array reference but assign fresh slot identities for the replaced content.

### Teardown

When a component disconnects, the runtime must:

- stop future renders for the disconnected instance
- remove reactive observers
- emit `beforeDestroy`
- clean up event listeners in the component subtree and structured event listeners
- remove the style element when the last instance of that tag disappears
- emit `destroyed`
- release strong references used for runtime bookkeeping

## Constraints

- Public behavior changes require a spec update and usually an ADR.
- Browser-only APIs must be guarded.
- The opacity-based first-presentation guard requires a host box (`display: contents` hosts are not covered); author initialization code must not override its temporary opacity.
- Dynamic code execution is restricted to the script-compilation boundary.
- DOM reconciliation must preserve custom element instances whenever identity rules allow it.

## Edge Cases

- `Core()` called multiple times
- registrations performed before and after initialization
- disconnect or reconnect while dependencies or render hooks are pending
- slot content remains connected but locally paint-protected while asynchronous first-template processing or mount hooks run
- superseded first renders retain protection until a successful commit; readiness and mounted must not report an aborted attempt as successful
- first-render protection must preserve author display, visibility, opacity and transition declarations, including priorities; it must not change descendant display values
- rendering failures release temporary presentation overrides and log the failure; failure recovery is not a successful first presentation
- shared inline component CSS is available before publication; external stylesheets and asynchronous work started by user hooks remain consumer-owned
- reconnect during async teardown
- array mutations that reorder looped items
- invalid or missing props
- missing plugins or modules
- SSR or non-DOM import environments

## Acceptance Criteria

- Component registration works before and after initialization.
- Lifecycle hooks fire in the documented order.
- `mounted` does not become a generic reconnect hook.
- DOM reconciliation preserves custom element instances where intended.
- Array identity behavior remains stable across loop-related mutations.
- Disconnect reliably removes observers and listeners.
- Existing runtime tests continue to cover component, model, reconciliation, and event-cleanup behavior.
