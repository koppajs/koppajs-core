# Quality Gates

## Local Validation Commands

Primary local validation commands for this repository:

```bash
pnpm check
pnpm test:package
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

`pnpm test:package` uses the current Node executable for consumers and requires
local npm and pnpm tooling. It does not use Vitest transforms or browser shims.
`prepack` also rebuilds ordinary pack/publish output; the consumer test disables
pack lifecycle scripts only because it has already built the package.

Use `pnpm validate` for the full validation flow before release work.

## Dependency Toolchain

The development stack uses Vite 8, Vitest 5, ESLint 10, JSDOM 30 and
TypeScript 6.0.3. Use Node 22.22.2+ on the Node 22 line or Node 24.15.0+
on the Node 24 line for repository checks; the runtime package engine contract
is unchanged. TypeScript 7 is blocked by typescript-eslint 8.72.1, whose
published peer range is `>=4.8.4 <6.1.0`. Node typings stay on the supported
Node 24 line rather than describing Node 26-only APIs.

TypeScript 6 requires an explicit `rootDir` for declaration output. Coverage
uses explicit `include` patterns; the obsolete `coverage.all` option is removed.
No package version or public runtime contract is changed by this tooling update.

Development dependency security fixes use scoped `pnpm.overrides` in `package.json`:
`glob@^13.0.0` resolves to `^14.0.2`, and `minimatch@<11.0.1` resolves to `^11.0.1`.
These replace vulnerable versions used by rimraf and ESLint/typescript-eslint while
upstream packages still declare the older major ranges. The former top-level
`overrides.glob` setting did not apply to pnpm and has been removed.
Keep these overrides until upstream dependency ranges include patched versions.
Validate changes with `pnpm audit`, `pnpm audit --prod`, `pnpm run validate`, and
a rimraf glob-mode smoke test in a temporary directory; no runtime dependency or
consumer engine requirement is added.

## Intentional Scope

- No Playwright: this repository does not ship a repository-local user interface; runtime behavior is covered with Vitest and JSDOM instead.
- No Stylelint: styling is not maintained as a standalone CSS/SCSS codebase in this package.

## CI

GitHub Actions currently enforces the following:

- `ci.yml`
  - runs on push to `main`
  - runs on pull requests targeting `develop` or `main`
  - tests Node 22 and Node 24
  - runs typecheck, lint, format check, tests with coverage, and `test:package`

## Release Gates

`release.yml` runs on tag pushes matching `v*.*.*` and requires:

- dependency installation with a frozen lockfile
- typecheck
- lint
- format check
- tests with coverage
- `test:package`: fresh build, real tarball, offline install and native ESM/CommonJS/main checks
- exact match between the tag version and `package.json`

After those pass, the workflow creates a GitHub release and publishes to npm.

## Commit-Time Gates

Local Git hooks currently provide:

- `pre-commit`
  - runs `pnpm run check:docs`
  - runs `lint-staged` through the root config
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
