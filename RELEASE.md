# Release Process for `@koppajs/koppajs-core`

This document describes the repository-specific release workflow for
`@koppajs/koppajs-core`.

The project uses a manual, tag-driven release process.
Only tagged versions are official releases.

The effective flow is:

1. Finalize the release content on `develop`
2. Create a `release/*` branch from that state
3. Merge the release branch into `main`
4. Tag the release commit on `main` as `vX.Y.Z`
5. Push the tag
6. Let GitHub Actions validate and publish the release
7. Merge the updated `main` back into `develop`

---

## Release Model

This repository does not use automated versioning tools such as Changesets or
semantic-release.

The release is controlled by:

- the version in `package.json`
- the release entry in `CHANGELOG.md`
- the merge of the release-ready state into `main`
- the Git tag in the form `vX.Y.Z`
- the GitHub Actions workflow in `.github/workflows/release.yml`

Important consequences:

- A merge to `main` alone does not publish anything
- A tag alone triggers the release workflow
- The tag version must exactly match `package.json`
- The tag must point to the release commit on `main`
- After a successful release, `main` should be merged back into `develop`
  so release-state metadata and any `main`-side adjustments are not lost

Do not tag `develop`.
Do not tag the `release/*` branch.
Tag only the release commit that is already on `main`.

---

## Preconditions

Before cutting a release, ensure all of the following are true:

- The intended release scope is already complete on `develop`
- `package.json` contains the target version
- `CHANGELOG.md` contains the corresponding release notes
- The lockfile is up to date
- The release content has been reviewed
- The repository secrets required by GitHub Actions are configured

Tooling expectations for local verification:

- Node.js 20 or newer
- pnpm 10.24.0 or newer

This repository also enforces `engine-strict=true` in `.npmrc`, so incompatible
Node.js or pnpm versions should be treated as a release blocker.

---

## What Must Be Prepared on `develop`

All release content is finalized on `develop`, not on `main`.

That includes:

- feature and fix commits intended for the release
- the version bump in `package.json`
- the matching entry in `CHANGELOG.md`
- any last release-blocking fixes

In other words:

- `develop` is where the release state is prepared
- `release/*` is the transport branch for that already prepared state
- `main` is the branch that receives the final release commit
- the tag on `main` is the technical release trigger
- after the release, `main` becomes the source for the final synchronization
  back into `develop`

---

## Local Validation Before Branching

Before creating the release branch, validate the exact release candidate locally.

Recommended commands:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm prettier --check . --config config/prettier.config.mjs --ignore-path config/.prettierignore
pnpm test:ci
pnpm build
```

Why this matters:

- the release workflow will run the same quality gates again in CI
- failing locally is cheaper than failing after tagging
- `pnpm build` verifies the publishable package output

The build step is especially relevant because it produces the package artifacts
that npm will publish:

- Vite builds `dist/index.es.js` and `dist/index.cjs.js`
- TypeScript generates declarations into `dist`
- `scripts/copy-dts.js` copies additional `src/**/*.d.ts` files into `dist`

The published package contents are controlled by the `files` field in
`package.json`. At the moment, the publish payload is intentionally limited to:

- `dist`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `package.json`

---

## Step-by-Step Release Workflow

### 1. Finalize the release on `develop`

Ensure `develop` already contains the exact release content.

Typical release preparation includes:

- updating `package.json` from the previous version to the next release version
- moving the relevant notes into the final section in `CHANGELOG.md`
- committing any last release fixes

Example intent:

```bash
git checkout develop
# verify package.json and CHANGELOG.md
git status
```

Make sure the release-ready state is committed before creating `release/*`.

Do not create the tag at this stage.

### 2. Create the `release/*` branch

Create a release branch from the validated `develop` state.

Example:

```bash
git checkout -b release/X.Y.Z
```

The exact branch name can follow the team convention.
What matters is that the branch is clearly a release branch and originates from
the correct `develop` commit.

If your `main` merge happens by pull request, push the branch and open the pull
request from `release/*` to `main`.

### 3. Merge the release branch into `main`

Merge `release/*` into `main` using the repository's normal process.
This may be a pull request or a direct merge, depending on branch protection and
team rules.

The critical requirement is:

- `main` must contain the final release commit before tagging

Conceptually:

```bash
git checkout main
git merge --no-ff release/X.Y.Z
```

If your repository policy requires a pull request, use a pull request.
The merge mechanics are less important than the resulting state on `main`.

### 4. Tag the release commit on `main`

After the release branch has been merged, create the Git tag on the release
commit that is now on `main`.

Example:

```bash
git checkout main
git pull
git tag vX.Y.Z
```

The tag format is mandatory:

- `vX.Y.Z` is valid
- `X.Y.Z` is not valid for this workflow

### 5. Push `main` and the tag

Push the merged `main` branch and then the tag.

Example:

```bash
git push origin main
git push origin vX.Y.Z
```

The release workflow is triggered by the tag push.
Without the tag push, no npm release happens.

### 6. Wait for the release workflow to finish

Do not merge `main` back into `develop` before the release result is clear.

First verify that:

- the GitHub Actions release workflow passed
- the GitHub Release was created
- the npm publish step completed successfully

Only after that should the branch synchronization be finalized.

### 7. Merge `main` back into `develop`

After the release has been successfully published, merge the updated `main`
back into `develop`.

This is the preferred final cleanup step for this repository.

Why it matters:

- it keeps `develop` aligned with the exact released state on `main`
- it preserves release-only metadata updates
- it brings back any `main`-side adjustments made during the release path
- it prevents the next release from starting from an incomplete branch state

Conceptually:

```bash
git checkout develop
git merge --no-ff main
```

If your repository policy requires a pull request, merge `main` back into
`develop` through a pull request instead.

---

## What GitHub Actions Does

The workflow `.github/workflows/release.yml` runs on:

```yaml
on:
  push:
    tags:
      - 'v*.*.*'
```

That means every pushed tag matching `vX.Y.Z` starts the release pipeline.

The job currently performs these steps:

1. Checkout the repository with full history
2. Install pnpm
3. Setup Node.js 22
4. Run `pnpm install --frozen-lockfile`
5. Run `pnpm typecheck`
6. Run `pnpm lint`
7. Run the Prettier check
8. Run `pnpm test:ci`
9. Run `pnpm build`
10. Verify that `GITHUB_REF_NAME` without the `v` prefix matches
    `package.json.version`
11. Create a GitHub Release
12. Run `npm publish --access public`

If any step fails, the release job stops immediately.

---

## Version Match Rule

The release workflow contains an explicit guard:

- tag `vX.Y.Z` requires `package.json` version `X.Y.Z`
- a mismatched tag and `package.json` version fails the release

This is one of the most important failure points in the process.

Before pushing a tag, always double-check:

- the merged commit on `main`
- the version in `package.json`
- the tag name you are about to push

---

## GitHub Release and npm Publish

If all checks pass, the workflow does two release actions:

1. It creates a GitHub Release with generated release notes
2. It publishes the package to npm with public access

This requires:

- `GITHUB_TOKEN` for creating the GitHub Release
- `NPM_TOKEN` repository secret for `npm publish`

If `NPM_TOKEN` is missing or invalid, the workflow can pass validation and still
fail at the publish step.

---

## Practical Checklist

Use this as the maintainer checklist for every release:

1. Verify the release scope on `develop`
2. Update `package.json`
3. Update `CHANGELOG.md`
4. Run local validation
5. Create `release/*` from `develop`
6. Merge `release/*` into `main`
7. Confirm the merged commit on `main` has the correct version and changelog
8. Create tag `vX.Y.Z` on that `main` commit
9. Push `main`
10. Push the tag
11. Watch the GitHub Actions release workflow
12. Verify the GitHub Release exists
13. Verify the package version is available on npm
14. Merge `main` back into `develop`

---

## Common Mistakes to Avoid

- Preparing the version bump on `main` instead of `develop`
- Tagging before the release branch has been merged into `main`
- Tagging `develop` or `release/*` directly
- Pushing a tag that does not match `package.json`
- Forgetting to update `CHANGELOG.md`
- Assuming a merge to `main` automatically publishes to npm
- Forgetting that the release workflow uses the pushed tag as its trigger
- Forgetting to merge the released `main` state back into `develop`

---

## Summary

For `@koppajs/koppajs-core`, the release is prepared on `develop`, moved through
a `release/*` branch, merged into `main`, triggered by a version tag on `main`,
and finally synchronized back from `main` into `develop`.

The tag is not a formality.
It is the event that starts validation, GitHub release creation, and npm
publication.
