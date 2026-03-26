# AI Workflow

## Read First

Before editing code in this repository, read in this order:

1. `DECISION_HIERARCHY.md`
2. `AI_CONSTITUTION.md`
3. `ARCHITECTURE.md`
4. relevant docs in `docs/adr/`, `docs/specs/`, and `docs/architecture/`
5. `DEVELOPMENT_RULES.md`
6. `TESTING_STRATEGY.md`
7. the source files and tests being changed

## Working Rules

- Follow `spec -> tests -> implementation` for behavior changes.
- Prefer existing runtime patterns over new abstraction layers.
- Do not silently change public APIs, lifecycle order, directives, or the `ComponentSource` contract.
- Keep browser-only code guarded.
- Use `src/utils/script.ts` as the only dynamic code-generation boundary.
- Treat `.ai/`, `dist/`, and `coverage/` as generated output, not source of truth.

## Required Documentation Updates

Update docs in the same change when:

- architecture changes
- testing strategy or quality gates change
- release workflow changes
- contributor workflow changes
- AI workflow expectations change

Add an ADR for architectural changes and a spec for public-behavior changes.

## Verification

Run the narrowest useful checks while iterating, then the broader repository checks when the change is wide or release-sensitive.
