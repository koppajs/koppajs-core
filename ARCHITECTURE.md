# Architecture

## System Overview

`@koppajs/koppajs-core` is the runtime package for KoppaJS components. It consumes
`ComponentSource` payloads produced by the KoppaJS Vite plugin, registers them as custom
elements, executes controller code, manages reactive state, processes templates, binds events,
and reconciles DOM updates while preserving custom element instances.

The package is intentionally runtime-focused:

- no virtual DOM
- no runtime dependency tree in production
- no hidden framework scheduler outside the explicit observer and render flow
- explicit boundaries between compilation, runtime state, template processing, and DOM updates

## Primary Runtime Flow

1. `Core.take()` receives a component, plugin, or module.
2. `Core()` initializes the DOM environment once and processes queued registrations.
3. Components are registered with `customElements.define()` in `src/component.ts`.
4. When a component connects:
   - optional dependency imports are resolved from `ComponentSource.deps`
   - controller code is compiled and executed
   - a reactive model is created from controller state
   - props, lifecycle hooks, plugins, and modules are wired
   - the template is processed into a `DocumentFragment`
   - events are bound
   - the fragment is reconciled into the host element
5. State mutations schedule re-render work through the model observer pipeline.
6. Disconnect teardown removes observers, event listeners, styles, and runtime references.

Detailed sequence notes live in `docs/architecture/runtime-flow.md`.

## Major Subsystems

### Public Entry And Bootstrap

- `src/index.ts`
- Owns the public `Core` callable and stable exports.
- Queues `take()` calls until initialization.
- Initializes DOM-specific infrastructure once:
  - global event tracking patch
  - HTMLElement extension registration
  - subtree disconnection observer

### Component Runtime

- `src/component.ts`
- Registers custom elements and owns the connect, render, update, and disconnect lifecycle.
- Resolves parent relationships, props, modules, plugins, lifecycle hooks, and style injection.
- Distinguishes two controller execution modes:
  - `options`: creates `userContext` by composing methods and state and binds `this`
  - `composite`: keeps state and methods separate and avoids implicit `this` binding

### Reactive Model

- `src/model.ts`
- Provides proxy-based reactivity, observer batching, watch subscriptions, and state versioning.
- Preserves object and array references through in-place updates where required by the runtime.
- Maintains slot-sidecar identity metadata for reactive arrays used in loop rendering.

### Template Processing

- `src/template-processor.ts`
- Evaluates template expressions and directives such as interpolation, `loop`, `if`, `else`, `ref`, and slot-aware rendering.
- Produces a processed fragment for reconciliation.

### Event Binding And Cleanup

- `src/event-handler.ts`
- Binds declarative native DOM handlers and structured event definitions.
- Supports selector targets, `window`, and `$refs`-based targets.

- `src/global-event-cleaner.ts`
- Tracks global event listener registration and cleans listeners from removed DOM subtrees.
- Uses one global patch and one global mutation observer, both browser-guarded and idempotent.

### DOM Identity And Reconciliation

- `src/utils/reconcile.ts`
- Updates host DOM without replacing preserved custom element instances.
- Matches custom elements by structural identity and optional slot identity.

- `src/utils/identity.ts`
- Owns non-enumerable node identity markers used by reconciliation.

### Script Execution Boundary

- `src/utils/script.ts`
- The explicit runtime boundary for executing controller code emitted by the plugin.
- Injects `$refs`, `$parent`, `$emit`, `$take`, module variables, and resolved dependency bindings.

### Types And Ambient Contracts

- `src/types.ts`
- Public type anchor for the package and the core/plugin contract.
- Hosts public runtime types, lifecycle names, extension interfaces, and ambient declarations.

- `src/globals.d.ts` and `src/kpa.d.ts`
- Public ambient type surface for HTMLElement helpers and `.kpa` module handling.

## Important Contracts

### `ComponentSource`

The `ComponentSource` contract is the critical boundary between this package and the KoppaJS Vite
plugin. At minimum the runtime expects:

- `template`
- `script`
- `style`

Optional fields such as `type`, `deps`, `scriptMap`, and `structAttr` are interpreted by the core.
Any breaking change to this contract requires coordinated documentation and an ADR.

### Extensions

- Plugins install once at the `Core` level and expose per-component setup behavior.
- Modules install once at the `Core` level and attach per-host-element behavior.
- Both are stored in `ExtensionRegistry`.

### Render Scheduling

- The model batches observer notifications with `queueMicrotask`.
- Component renders are scheduled with `requestAnimationFrame`.
- Ancestor renders suppress redundant child self-renders.
- `watchList` can filter updates so components only re-render for relevant path prefixes.

## Architectural Invariants

- `Core()` and DOM setup are idempotent.
- DOM globals must be guarded so importing the package outside the browser stays safe.
- DOM nodes, `Window`, and `Document` are never proxied by the reactive model.
- Full array replacement preserves the live array reference and refreshes slot identities.
- Loop identity must remain stable across structural array mutations.
- Reconciliation must preserve custom element instances whenever identity or position allows it.
- `mounted` is a first-mount lifecycle event, not a reconnect event.
- Event listeners added during rendering must be removable during disconnect or subtree cleanup.
- Style injection is per component tag and should disappear when the last instance disappears.

## Repository Boundaries

- `src/` is the runtime package. It must not depend on `test/`, `scripts/`, or generated output.
- Root config files own TypeScript, Vite, Vitest, ESLint, Prettier, lint-staged, and commitlint configuration.
- `test/` mirrors runtime concerns and validates behavior under JSDOM using Vitest.
- `scripts/` contains maintenance tooling, including the `.ai/` dump generator.
- `.github/workflows/` owns CI and release automation.
- `.ai/` is generated analysis output and is not authoritative architecture documentation.

## Related Documents

- `docs/architecture/runtime-flow.md`
- `docs/meta/repository-map.md`
- `docs/adr/README.md`
- `docs/specs/component-runtime-contract.md`
