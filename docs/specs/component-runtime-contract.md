# Spec: Component Runtime Contract

- Status: Approved
- Owner: KoppaJS core maintainers
- Last updated: 2026-11-23

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

1. resolve `ComponentSource.deps` if present and reject an obsolete connection
2. attach modules and build the full live context, including `$take` for plugin access
3. instantiate the controller through the selected entry
4. create reactive state, process props, and apply component-mode bindings
5. register lifecycle hooks, the runtime instance, and the model observer
6. emit `created` and await its completion before rendering
7. render the template into the host
8. emit `mounted` and resolve readiness only after the first successful render

### Controller Factory Contract

`ComponentSource` retains required string fields `template`, `script`, and `style`.
It additionally accepts `compiledScript?: CompiledScript`. The package root publicly exports
`CompiledScript` as a type with this synchronous signature:

```ts
type CompiledScript = (
  context: ComponentContext,
  resolvedDeps?: Record<string, unknown>,
) => ComponentController
```

- Resolve `deps` before invoking either controller entry. Pass the resolved values by their
  declared keys as the second argument; pass `undefined` when no dependency map is supplied
  (`deps` absent or `null`). An explicitly empty dependency map resolves to an empty record.
- When `compiledScript !== undefined`, it takes precedence over `script`. Do not call
  `compileCode` or compile the script string on that path.
- The factory receives the same `ComponentContext` used by the string-script path:
  `$refs`, `$parent`, `$emit`, `$take`, and attached module properties. Preserve live
  references, especially the `$refs` object populated during rendering; do not pass snapshots.
- The factory must return a non-null, non-array `ComponentController` object synchronously.
  Promises and thenables are invalid. A supplied non-function is invalid as well.
- A factory throw, invalid factory, or invalid result fails initialization through the existing
  error handling. Never fall back to the string script or retry through `compileCode`.
- If `compiledScript` is absent or `undefined`, retain the existing string-script execution path.
- `script` remains a required string, including for precompiled sources, and may be empty.
  Producers should emit `script: ''` with a precompiled factory to avoid shipping duplicate
  controller code in the bundle.
- Both entries converge on the existing model, component modes, lifecycle, rendering, event
  binding, and teardown. The factory is an additive entry, not a second execution engine.

### CSP Boundary

A precompiled controller with a static template and function-valued structured events can run
under a Content Security Policy that disallows `unsafe-eval`. This guarantee concerns controller
instantiation without runtime code generation, not all possible templates or user code.
Dynamic template expressions still use the existing expression evaluator and are not covered.
Precompilation does not relax the application's script or style policy.

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
- capture caller-supplied slot nodes for slot-bearing templates on the first render attempt and reuse those same nodes on updates and reconnection; never treat the generated template wrapper as new slot input
- await completion of created hooks even for observer-triggered or reconnected first renders
- retain declarative native event binding names on reused node identity so a new controller can rebind them once after completed listener teardown
- bind parent declarative handlers on nested custom-element hosts, but never consume or rebind their child-owned internal template handlers
- prepare host slot content without removing live nodes during asynchronous work
- keep original slot nodes connected and measurable, but suppress host painting until the first successful local DOM commit; do not wait for descendants or route readiness
- restore author presentation declarations at commit, disconnect, or terminal initialization/render failure; a failed render does not emit mounted or resolve readiness
- process directives and interpolation
- bind structured events to committed DOM targets, resolving selectors and refs against the nodes retained by reconciliation
- transfer declarative native bindings to retained template nodes, replacing obsolete handlers without accumulating listeners
- bind newly inserted targets before connection and transfer bindings to retained HTML/SVG targets before attribute changes or moves so synchronous custom-element events remain observable
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
- caller children arriving after connection are included until the first slot capture; arbitrary post-capture light-DOM replacement is not a dynamic slot API
- reconnect during async teardown
- reconnect after an aborted initial render must resume rendering and release first-presentation protection without duplicating mounted hooks
- reconnect after completed teardown must initialize from the original slot nodes, not nest the previous rendered template
- reactive updates of slotted components must preserve caller node identity without adding template wrapper levels
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
- Native DOM events (declarative and structured selector/ref/window targets) fire exactly once after repeated updates in both component modes.
- Ref targets identify committed nodes, including preserved native elements and custom-element hosts.
- Removed event targets and completed teardown have no active component-owned listeners; remount binds only the fresh controller.
- Disconnect reliably removes observers and listeners.
- Precompiled factories take precedence without calling `compileCode`, receive resolved
  dependencies and live context references, and retain existing lifecycle and teardown behavior.
- Invalid factories, throws, and invalid or asynchronous results fail without string-script fallback.
- String-only components retain their existing behavior.
- `node --test test/browser-csp.test.mjs` provides a real-browser CSP check of the built
  package with a static template and structured function handlers, without `unsafe-eval`.
  JSDOM or mocked `Function` tests alone are not sufficient CSP evidence.
- Existing runtime tests continue to cover component, model, reconciliation, and event-cleanup behavior.
