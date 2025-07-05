# 🤝 Contributing to KoppaJS Core

> _"Only start things you're willing to finish with dedication."_

KoppaJS is more than a framework. It's a declaration of intent –  
that software can be simple, transparent, and elegant.  
No virtual DOM. No class hierarchies. No unnecessary abstractions.  
Just clean, functional JavaScript – with full ownership of every line.

If you choose to contribute to this project, do so not just with code,  
but with clarity. I welcome developers who don’t just write _working_ code,  
but **clear**, **consistent**, and **conscious** code.

KoppaJS follows the principle of **Intentional Architecture**:

- **No factories. No classes. No magic.**  
  The framework avoids hidden abstractions. Code is direct, modular, and functional by design.

- **Every function is explicit, every behavior explainable.**  
  Each behavior arises from visible logic – not from implicit lifecycle or internal state machines.

- **Data is referenced, not duplicated.**  
  Values flow by reference to maintain synchronicity. Shallow copies are permitted only where strictly necessary (e.g., in loop contexts).

- **Responsibility lies with the developer, not the framework.**  
  KoppaJS gives full control. You decide what happens, when, and why – the framework never overrides your intent.

If that resonates with you – welcome to the engine room of KoppaJS. 🔧

---

## 📦 Requirements

Before contributing, ensure you have the following installed:

- **Node.js** ≥ 20.18.0
- **pnpm** ≥ 10.12.1

To install dependencies:

```bash
pnpm install
```

---

## 🚀 Development Setup

### 1. Build the project

```bash
pnpm build
```

This runs:

- type checking
- bundling with Vite
- type definitions generation

### 2. Run tests

```bash
pnpm test
```

For coverage:

```bash
pnpm test:coverage
```

---

## 💡 Code Style & Quality

- Use **Prettier** and **ESLint** for consistent code formatting.
- Validate all style rules:

```bash
pnpm lint
```

To fix issues:

```bash
pnpm format
```

---

## 📘 Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org) with Gitmojis.

Example:

```
feat: ✨ Add support for lifecycle event 'processed'
```

> 🛡️ All commits are automatically validated using a custom Husky hook.

System commits (e.g. `Merge`, `Revert`, `chore(release)`, etc.) are excluded from validation.

---

## 🔒 Commit Hook Setup

Husky is used to enforce formatting and commit message standards:

```bash
pnpm prepare
```

Ensure `.husky/commit-msg` exists and is executable.

---

## 🧪 Test Structure

Each module should have a corresponding `.test.ts` file.  
Use **Vitest** for writing and running unit tests.

---

## ✅ Testing Guidelines

Each function must be tested thoroughly and consistently.  
KoppaJS follows a clear 3-step strategy for every test case.

### 🧪 Test Structure

- **One `describe()` per function**

  - Keeps test structure modular and clean
  - Matches file/function name for traceability

- **Three `it()` blocks per function**
  - ✅ **Valid case** — ensures expected behavior with valid input
  - ❌ **Error case** — checks that invalid input throws or fails gracefully
  - ⚠️ **Edge case** — input is valid type but leads to a logically wrong or undefined result

### 📌 Principles

- Tests must be **independent**, **explicit**, and **readable**
- Use **realistic** inputs that reflect actual framework usage
- Avoid `as any` unless needed for intentional edge-case testing
- Keep test files parallel to source files (e.g. `src/utils/helper.ts` → `test/utils/helper.test.ts`)

> Aim for clarity over quantity. A well-tested function needs **three thoughtful tests**, not thirty shallow ones.

---

## 🧱 Architecture Principles

- Functional and modular — no classes or factories
- Runtime-safe typing with `satisfies` where possible
- Guards and helpers separated into `utils/*`
- Avoid `as` type assertions unless absolutely necessary

---

## 🛠️ Scripts

| Command               | Description                        |
| --------------------- | ---------------------------------- |
| `pnpm build`          | Full build including type & bundle |
| `pnpm rebuild`        | Clean & rebuild from scratch       |
| `pnpm test`           | Run tests                          |
| `pnpm lint`           | Lint JS/TS & styles                |
| `pnpm format`         | Auto-format code                   |
| `pnpm dump-code`      | Output full code snapshot          |
| `pnpm analyze-code`   | Analyze code structure             |
| `pnpm list-structure` | Output full Structure snapshot     |

---

## 📬 Still have questions?

Open an issue or start a discussion on [GitHub](https://github.com/koppajs/koppajs-core).

Happy hacking! 🚀
