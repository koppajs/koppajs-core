# ADR-0008: Additive Precompiled Controller Entry

- Status: Accepted
- Date: 2026-11-23

## Context

The string-based `ComponentSource` contract instantiates controllers through the controlled
runtime code-generation boundary in ADR 0003. Applications with a Content Security Policy
that excludes `unsafe-eval` need a controller entry that does not generate code at runtime.
Replacing the component engine or dropping string-script compatibility would expand the
change beyond that need.

## Decision

Add optional `compiledScript?: CompiledScript` to `ComponentSource` and publicly export
`CompiledScript` as a type:

```ts
type CompiledScript = (
  context: ComponentContext,
  resolvedDeps?: Record<string, unknown>,
) => ComponentController
```

Resolve dependencies before invocation. Pass the same live context as the existing entry,
including refs and module properties, and the dependency record as the second argument
(`undefined` without a dependency map). The factory must synchronously return a non-null,
non-array controller object, never a Promise or thenable.

A supplied factory takes precedence over `script` without calling `compileCode`. Invalid
factories, invalid results, and factory throws fail initialization without string-script
fallback. An absent or `undefined` factory retains the string path. Keep the required
`script` field a string and emit `script: ''` alongside a factory to avoid duplicate bundle code.

Both entries converge before model setup and use the same component modes, lifecycle,
rendering, events, and teardown. This is an additive entry, not a second engine. ADR 0003
continues to govern runtime code generation on the string and expression-evaluation paths.

## Consequences

- Existing string-script consumers retain their behavior and lifecycle ordering.
- Producers can generate ordinary functions at build time without a runtime compiler or
  interpreter dependency. Existing plugin versions do not automatically gain that output.
- Live refs and module attachments remain available without snapshotting the context.
- Static templates with structured function handlers can run without `unsafe-eval`.
  Dynamic template expressions and arbitrary consumer code are not covered; this is not
  a claim of universal CSP compatibility or a relaxation of script/style policy.
- A real-browser CSP check (`node --test test/browser-csp.test.mjs`) against built package
  output is required evidence. JSDOM and mocked code-generation failures cannot prove CSP.
- Tests must protect priority, dependencies, live context, failure without fallback, and
  unchanged lifecycle/cleanup in addition to the browser-level boundary.

## Alternatives considered

- A second precompiled runtime or local AST interpreter
  - Rejected because it duplicates orchestration and introduces divergent semantics.
- Requiring precompiled controllers and removing the string entry
  - Rejected because it breaks the established core/plugin contract unnecessarily.
- Falling back to string compilation when a factory fails
  - Rejected because it hides producer errors and can violate the consumer's CSP.
