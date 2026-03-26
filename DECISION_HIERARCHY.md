# Decision Hierarchy

## Purpose

This document defines which repository documents are authoritative when guidance conflicts.
Lower-precedence documents must be updated to match higher-precedence ones.

## Precedence Order

1. Approved specs in `docs/specs/`
2. Accepted ADRs in `docs/adr/`
3. `ARCHITECTURE.md` and supporting files in `docs/architecture/`
4. `AI_CONSTITUTION.md`
5. `DEVELOPMENT_RULES.md`
6. `TESTING_STRATEGY.md` and `docs/quality/quality-gates.md`
7. Repository map and supporting governance notes in `docs/meta/`
8. Contributor workflow docs such as `CONTRIBUTING.md` and `RELEASE.md`
9. Informational docs such as `README.md` and `CHANGELOG.md`
10. Generated artifacts such as `.ai/`, `dist/`, and `coverage/`

## How To Resolve Conflicts

- Follow the highest-precedence applicable document.
- Update every lower-precedence document touched by the conflict in the same change when feasible.
- If a higher-precedence document is missing for a material behavior or architectural change, create it before finishing the change.
- If implementation differs from the highest-precedence document, do not silently pick one. Reconcile the gap with a spec, ADR, or explicit follow-up.

## Tests In The Hierarchy

Tests are executable evidence, not top-level governance. They should reflect approved specs and accepted architecture.

When tests conflict with higher-precedence documents:

- update the tests if the documented intent is correct
- update the governing document first if the implementation is the new intended behavior

Never use stale tests as justification for undocumented architecture drift.

## Public Compatibility Rule

For shipped public behavior, do not rely on README examples or generated output as the source of truth.
Compatibility-sensitive changes must be justified by a spec and, when architectural, an ADR.
