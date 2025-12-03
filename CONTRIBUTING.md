<a id="contributing-top"></a>

<!-- PROJECT LOGO -->
<div align="center">
  <img src="https://public-assets-1b57ca06-687a-4142-a525-0635f7649a5c.s3.eu-central-1.amazonaws.com/koppajs/koppajs-logo-text-900x226.png" width="500" alt="KoppaJS Logo">
</div>

<br>

<!-- TITLE -->
<div align="center">
  <h1 align="center">Contributing to KoppaJS Core</h1>
  <h3 align="center">Build with intention. Contribute with clarity.</h3>
  <p align="center">
    <i align="center">A framework powered by simplicity, transparency, and responsibility.</i>
  </p>
</div>

<br>

---

## ✨ Philosophy

> _"Only start things you're willing to finish with dedication."_

KoppaJS is more than a codebase — it is a declaration of intent.
A belief that frontend work can be **simple**, **transparent**, and **elegant**, without the noise of unnecessary abstraction.

If you contribute here, you join a community that values:

- **clarity over cleverness**
- **function over abstraction**
- **responsibility over hidden behavior**

KoppaJS follows a principle we call **Intentional Architecture**:

- **No factories. No classes. No magic.**
  Everything is functional, explicit, and traceable.

- **Every behavior is explainable.**
  Nothing happens behind your back — no invisible lifecycles.

- **Data flows by reference.**
  Never duplicate what can be shared. Keep state synchronized by design.

- **The developer is in control.**
  KoppaJS never overrides your intent. You decide what happens, when, and why.

If these ideas resonate with you — welcome to the engine room of KoppaJS. 🔧

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## 📦 Requirements

Before contributing, ensure you have the following installed:

- **Node.js ≥ 20**
- **pnpm ≥ 10.24.0**

Install dependencies:

```bash
pnpm install
```

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## 🚀 Development Setup

### 1. Build the project

```bash
pnpm build
```

This performs:

- Type checking
- Bundling with Vite
- Type definition generation

### 2. Run tests

```bash
pnpm test
```

Coverage:

```bash
pnpm test:coverage
```

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## 💡 Code Style & Quality

KoppaJS uses strict and consistent formatting through:

- **ESLint (Flat Config)**
- **Prettier**
- **TypeScript strict mode**

Validate lint rules:

```bash
pnpm lint
```

Fix formatting issues:

```bash
pnpm format
```

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## 📝 Commit Conventions

We use **Conventional Commits**, optionally with Gitmojis.

Example:

```
feat: ✨ add support for 'processed' lifecycle hook
```

All commit messages are validated via a Husky hook.

System commits like `Merge`, `Revert`, or `fixup!` are automatically skipped.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## 🔒 Commit Hook Setup

Install Husky:

```bash
pnpm prepare
```

Ensure `.husky/commit-msg` exists and is executable.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## 🧪 Testing Guidelines

KoppaJS uses **Vitest** with a strict philosophy:

### The Three Test Rule

Every function should have:

- ✅ **Valid Case** — works as intended
- ❌ **Error Case** — fails gracefully
- ⚠️ **Edge Case** — unexpected but valid input

This ensures robust, intentional behavior.

### Structure

- **One `describe()` per function**
- **Three `it()` blocks** per exported utility or behavior function
- Tests mirror the folder structure:
  `src/utils/helper.ts` → `test/utils/helper.test.ts`
- No global mocks
- Explicit, isolated input/output per test

> Clarity over quantity — three meaningful tests beat thirty shallow ones.

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## 🧱 Architecture Principles

KoppaJS Core follows a strict functional foundation:

- Functional and modular — **no classes**, **no factories**
- Runtime-safe types with `satisfies`
- Clear separation of logic and helpers under `utils/*`
- Avoid `as` type assertions unless absolutely necessary
- Prefer explicit data flow and composable functions

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## 🛠️ Scripts

| Command               | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `pnpm build`          | Full production build: typecheck → Vite bundle → generate `.d.ts` files |
| `pnpm rebuild`        | Clean the project completely and rebuild from scratch                   |
| `pnpm typecheck`      | Run TypeScript type checking using `config/tsconfig.json`               |
| `pnpm generate:types` | Emit public type definitions using `tsconfig.types.json`                |
| `pnpm test`           | Run the full Vitest test suite once                                     |
| `pnpm test:watch`     | Run tests in watch mode                                                 |
| `pnpm test:coverage`  | Generate coverage report (text + HTML)                                  |
| `pnpm test:ci`        | CI-friendly test run with coverage                                      |
| `pnpm lint`           | Lint all TypeScript/JavaScript via ESLint (flat config)                 |
| `pnpm format`         | Format all files using Prettier                                         |
| `pnpm dump-code`      | Generate a full code snapshot (`---code_dump.txt`)                      |
| `pnpm analyze-code`   | Analyze project structure and produce report (`---code_analysis`)       |
| `pnpm list-structure` | Write all tracked file paths to `---project-structure`                  |
| `pnpm clean`          | Remove `node_modules`, `dist`, and lockfiles                            |

<p align="right">(<a href="#contributing-top">back to top</a>)</p>

---

## 📬 Need Help?

Open an issue or start a discussion on GitHub:
https://github.com/koppajs/koppajs-core

Thank you for contributing — and welcome aboard. 🚀

<p align="right">(<a href="#contributing-top">back to top</a>)</p>
