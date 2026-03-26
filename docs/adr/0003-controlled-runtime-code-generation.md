# ADR-0003: Controlled Runtime Code Generation Boundary

- Status: Accepted
- Date: 2026-03-12

## Context

The KoppaJS Vite plugin emits controller code as strings inside `ComponentSource`. The core runtime
must execute that code with access to context variables, module attachments, and optional resolved
dependencies. The current implementation uses `new Function` and localized `eval` inside
`src/utils/script.ts`. This is a high-sensitivity boundary and should not remain implicit.

## Decision

Runtime code generation is allowed only as an explicit boundary in `src/utils/script.ts`.

The boundary is responsible for:

- executing controller code emitted by the compiler
- exposing approved context variables
- injecting resolved dependency bindings

New uses of `eval` or `new Function` outside this boundary are not allowed without a new ADR.

## Consequences

- The core/plugin contract remains explicit and centralized.
- Security and debuggability concerns are constrained to one subsystem instead of spreading across the runtime.
- Any compatibility change to the generated controller shape requires coordinated changes across the plugin, specs, tests, and architecture docs.
- Future replacement with a different execution strategy remains possible because the boundary is isolated.

## Alternatives considered

- Allowing ad hoc runtime evaluation in multiple modules
  - Rejected because it would make behavior harder to audit and reason about.
- Replacing runtime execution with a local AST interpreter
  - Rejected for now because it would significantly increase complexity and is not needed by the current architecture.
- Requiring fully precompiled runtime modules only
  - Rejected for now because the current KoppaJS toolchain already depends on the string-based `ComponentSource` contract.
