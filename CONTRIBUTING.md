<a id="contributing-top"></a>

<!-- PROJECT LOGO -->
<div align="center">
  <img src="https://public-assets-1b57ca06-687a-4142-a525-0635f7649a5c.s3.eu-central-1.amazonaws.com/koppajs/koppajs-logo-text-900x226.png" width="500" alt="KoppaJS Logo">
</div>

<br>

<!-- TITLE -->
<div align="center">
  <h1 align="center">Contributing to KoppaJS Projects</h1>
  <h3 align="center">Build with intention. Contribute with clarity.</h3>
  <p align="center">
    <i>A framework ecosystem powered by simplicity, transparency, and responsibility.</i>
  </p>
</div>

<br>

---

## Philosophy

> _“Only start things you are willing to finish with dedication.”_

KoppaJS is more than a collection of repositories — it is a declaration of intent.

The project exists to prove that frontend systems can be **simple**, **explicit**,
and **comprehensible**, without relying on unnecessary abstraction or hidden magic.

KoppaJS follows **Intentional Architecture**:

- **No factories. No hidden abstractions. No magic.**  
  Behavior must be explicit, traceable, and explainable.

- **Every behavior is understandable.**  
  No invisible lifecycles, no implicit state transitions.

- **Data flows by reference.**  
  What can be shared should not be duplicated.

- **The developer stays in control.**  
  KoppaJS does not override intent.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Requirements

Before contributing, ensure you have:

- **Node.js ≥ 20**
- **pnpm ≥ 10**

Install dependencies:

```bash
pnpm install
```

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Development Workflow

Each KoppaJS repository provides a consistent development experience.

Typical workflows include:

### Build

```bash
pnpm build
```

This may include:
- Type checking
- Bundling
- Generation of public type definitions (where applicable)

### Testing

```bash
pnpm test
```

Optional:

```bash
pnpm test:coverage
```

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Code Style & Quality

All KoppaJS projects enforce consistency through:

- **TypeScript (strict mode where applicable)**
- **ESLint**
- **Prettier**

Check code quality:

```bash
pnpm lint
```

Format code:

```bash
pnpm format
```

Contributions must pass all checks enforced by CI.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Commit Conventions

KoppaJS uses **Conventional Commits**.

Example:

```
feat: add support for processed lifecycle hook
```

Gitmojis are optional.

Commit messages are validated automatically where commit hooks are enabled.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Testing Guidelines

Most KoppaJS projects follow the **Three Test Rule**:

- **Valid Case** — expected usage
- **Error Case** — invalid or failing input
- **Edge Case** — unusual but valid scenario

General expectations:

- Tests should mirror the source structure
- Each exported utility or behavior should be covered
- No global mocks unless unavoidable
- Test data should be explicit and minimal

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Architectural Expectations

When contributing to KoppaJS projects:

- Prefer **explicit, functional code**
- Avoid unnecessary abstraction
- Isolate helpers and guards clearly
- Avoid broad `any` or unchecked assertions unless justified
- Favor clarity over cleverness

If a change cannot be clearly explained, it likely does not belong.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Scripts

Each repository defines its own scripts, but commonly available commands include:

| Command        | Description                                  |
|---------------|----------------------------------------------|
| `pnpm build`  | Build the project                             |
| `pnpm test`   | Run tests                                    |
| `pnpm lint`   | Run lint checks                              |
| `pnpm format` | Format code                                  |
| `pnpm clean`  | Remove build artifacts                       |

Refer to the repository’s `package.json` for project-specific commands.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Releasing

KoppaJS projects use a **manual, tag-driven release process**.

General flow:

1. Update version and changelog
2. Commit the release preparation
3. Tag the release (`vX.Y.Z`)
4. Push the tag to `main`

CI will validate the release and publish artifacts where applicable.

Exact release behavior may vary by repository.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## Need Help?

Open an issue or start a discussion in the relevant repository.

Thank you for contributing — and for helping keep KoppaJS intentional, calm,
and a pleasure to build with.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>
