<a id="readme-top"></a>

<div align="center">
  <img src="https://public-assets-1b57ca06-687a-4142-a525-0635f7649a5c.s3.eu-central-1.amazonaws.com/koppajs/koppajs-logo-text-900x226.png" width="500" alt="KoppaJS Logo">
</div>

<br>

<div align="center">
  <a href="https://www.npmjs.com/package/@koppajs/koppajs-core"><img src="https://img.shields.io/npm/v/@koppajs/koppajs-core?style=flat-square" alt="npm version"></a>
  <a href="https://github.com/koppajs/koppajs-core/actions"><img src="https://img.shields.io/github/actions/workflow/status/koppajs/koppajs-core/ci.yml?branch=main&style=flat-square" alt="CI Status"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square" alt="License"></a>
</div>

<br>

<div align="center">
  <h1 align="center">@koppajs/koppajs-core</h1>
  <h3 align="center">Core runtime and component model for KoppaJS</h3>
  <p align="center">
    <i>Reactive components, explicit lifecycle seams, and a small runtime without virtual DOM overhead.</i>
  </p>
</div>

<br>

<div align="center">
  <p align="center">
    <a href="https://github.com/koppajs/koppajs-documentation">Documentation</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-vite-plugin">Vite Plugin</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-example">Example Project</a>
    &middot;
    <a href="https://github.com/koppajs/koppajs-core/issues">Issues</a>
  </p>
</div>

<br>

<details>
<summary>Table of Contents</summary>
  <ol>
    <li><a href="#what-is-koppajs-core">What is KoppaJS Core?</a></li>
    <li><a href="#features">Features</a></li>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#requirements">Requirements</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#runtime-model">Runtime Model</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#architecture--governance">Architecture & Governance</a></li>
    <li><a href="#community--contribution">Community & Contribution</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

---

## What is KoppaJS Core?

`@koppajs/koppajs-core` is the runtime package at the center of the KoppaJS
stack.

It owns the public bootstrap surface, component registration, DOM runtime
setup, lifecycle coordination, and the stable contracts that other KoppaJS
packages build on top of.

In practice that means:

- applications register components through `Core.take(...)`
- the runtime boots once through `Core()`
- the Vite plugin handles `.kpa` transformation, while core stays focused on
  runtime behavior

---

## Features

- component registration via the stable `Core.take(...)` API
- one-time runtime bootstrap through `Core()`
- reactive component model with explicit methods, refs, props, and lifecycle
  hooks
- modular extension surface for plugins and modules
- no virtual DOM dependency
- published package with ESM, CommonJS, and TypeScript types

---

## Installation

```bash
pnpm add @koppajs/koppajs-core
pnpm add -D @koppajs/koppajs-vite-plugin vite typescript
```

```bash
npm install @koppajs/koppajs-core
npm install -D @koppajs/koppajs-vite-plugin vite typescript
```

The fastest path for most users is still the official starter:

```bash
pnpm create koppajs my-app
```

---

## Requirements

For package consumers:

- a browser-based application environment
- a build pipeline that can consume KoppaJS components, typically Vite plus
  `@koppajs/koppajs-vite-plugin`

For local repository work:

- Node.js >= 20
- pnpm >= 10.24.0

---

## Getting Started

Recommended bootstrap path:

```bash
pnpm create koppajs my-app
cd my-app
pnpm install
pnpm dev
```

Manual registration with the public core API:

```ts
import { Core } from '@koppajs/koppajs-core'

import appView from './app-view.kpa'
import counterComponent from './counter-component.kpa'

Core.take(appView, 'app-view')
Core.take(counterComponent, 'counter-component')
Core()
```

This mirrors the bootstrap used in the official example project.

---

## Runtime Model

KoppaJS Core deliberately keeps its top-level contract small:

- `Core.take(componentSource, name)` registers a component definition
- `Core.take(pluginOrModule)` installs an extension definition
- `Core()` initializes the DOM environment and flushes queued registrations
- repeated `Core()` calls are safe and idempotent

The runtime does not own `.kpa` parsing. That stays in
`@koppajs/koppajs-vite-plugin`, which emits the component source objects that
core consumes at runtime.

---

## Roadmap

- continue hardening the stable runtime contracts
- keep the public bootstrap surface small and explicit
- deepen runtime specs and package-level governance documents
- support ecosystem packages such as the router, component library, and editor
  tooling without growing hidden runtime coupling

---

## Architecture & Governance

Project intent, runtime constraints, and contributor rules live in the repo
meta layer:

- [AI_CONSTITUTION.md](./AI_CONSTITUTION.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DECISION_HIERARCHY.md](./DECISION_HIERARCHY.md)
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)
- [RELEASE.md](./RELEASE.md)
- [ROADMAP.md](./ROADMAP.md)
- [docs/specs/component-runtime-contract.md](./docs/specs/component-runtime-contract.md)
- [docs/architecture/runtime-flow.md](./docs/architecture/runtime-flow.md)

Tagged releases are documented in `CHANGELOG.md`.

---

## Community & Contribution

Issues and pull requests are welcome:

https://github.com/koppajs/koppajs-core/issues

Contributor workflow details live in [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

Apache License 2.0 — © 2026 KoppaJS, Bastian Bensch
