# Architecture Decision Records

## Purpose

ADRs record architecture decisions that materially affect how this repository is built, maintained, or evolved.

Use an ADR when a change affects:

- public contracts
- runtime architecture
- major performance or compatibility tradeoffs
- new dependencies in the runtime package
- exceptions to existing development rules
- changes to extension or plugin boundaries

## Required ADR Structure

Every ADR must contain:

- Context
- Decision
- Consequences
- Alternatives considered

Optional sections such as status, date, or follow-up notes are encouraged when useful.

## Numbering

- Use zero-padded numeric prefixes: `0001-...`, `0002-...`, and so on.
- Never renumber accepted ADRs.

## Current ADRs

- `0001-native-dom-custom-elements.md`
- `0002-proxy-reactivity-with-array-identity.md`
- `0003-controlled-runtime-code-generation.md`

## Template

Use `docs/adr/template.md` for new ADRs.
