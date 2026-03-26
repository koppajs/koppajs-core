# Quality Gates

## Local Validation Commands

Primary local validation commands for this repository:

```bash
pnpm check
pnpm build
```

For narrower local checks, use:

```bash
pnpm typecheck:src
pnpm typecheck:test
pnpm lint
pnpm format:check
pnpm test
pnpm test:coverage
```

Use the full validation flow before release work.

## Intentional Scope

- No Playwright: this repository does not ship a repository-local user interface; runtime behavior is covered with Vitest and JSDOM instead.
- No Stylelint: styling is not maintained as a standalone CSS/SCSS codebase in this package.

## CI

GitHub Actions currently enforces the following:

- `ci.yml`
  - runs on push to `main`
  - runs on pull requests targeting `develop` or `main`
  - tests Node 20 and Node 22
  - runs typecheck, lint, format check, tests with coverage, and build

## Release Gates

`release.yml` runs on tag pushes matching `v*.*.*` and requires:

- dependency installation with a frozen lockfile
- typecheck
- lint
- format check
- tests with coverage
- build
- exact match between the tag version and `package.json`

After those pass, the workflow creates a GitHub release and publishes to npm.

## Commit-Time Gates

Local Git hooks currently provide:

- `pre-commit`
  - runs `lint-staged` through the root wrapper config
- `commit-msg`
  - runs `commitlint`

Hooks are installed through the `prepare` script during dependency installation.

This means staged source files are auto-linted and formatted, and commit headers are validated against Conventional Commits.

## Definition Of A Passing Change

A repository change is ready when:

- the relevant tests pass
- CI-facing scripts still reflect reality
- docs match the implemented workflow
- release instructions remain accurate if release-related behavior changed

## Documentation Obligations

Update this file when any of the following change:

- CI workflow triggers
- required validation commands
- supported Node versions in CI
- release validation steps
- local hook behavior
