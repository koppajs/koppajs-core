<a id="readme-top"></a>

<!-- PROJECT LOGO -->
<div align="center">
  <img src="https://public-assets-1b57ca06-687a-4142-a525-0635f7649a5c.s3.eu-central-1.amazonaws.com/koppajs/koppajs-logo-text-900x226.png" width="500" alt="KoppaJS Logo">
</div>

<br>

<!-- PROJECT SHIELDS -->
<div align="center">
  <a href="https://www.npmjs.com/package/@koppajs/koppajs-core"><img src="https://img.shields.io/npm/v/@koppajs/koppajs-core?style=flat-square" alt="npm version"></a> <a href="https://github.com/koppajs/koppajs-core/actions"><img src="https://img.shields.io/github/actions/workflow/status/koppajs/koppajs-core/ci.yml?branch=main&style=flat-square" alt="CI Status"></a> <a href="https://bundlephobia.com/package/@koppajs/koppajs-core"><img src="https://img.shields.io/bundlephobia/minzip/@koppajs/koppajs-core?style=flat-square" alt="Bundle size"></a> <a href="./LICENSE"><img src="https://img.shields.io/github/license/koppajs/koppajs-core?style=flat-square" alt="License"></a>
</div>

<br>

<!-- ELEVATOR PITCH -->
<div align="center">
	<h1 align="center">KoppaJS – Pragmatic frontend made modular</h1>
	<h3 align="center">Build fast, simple, and growable – without the noise of modern frameworks.</h3>
	<p align="center">
		<i align="center">A quiet rebellion against complexity – and a wish that building can still feel good.</i>
	</p>
</div>

<br>

<!-- IMPORTANT LINKS -->
<div align="center">
	<p align="center">
		<a href="https://github.com/koppajs/koppajs-documentation">Documentation</a>
		&middot;
		<a href="https://github.com/koppajs/koppajs-example">Example Project</a>
		&middot;
		<a href="https://github.com/koppajs/koppajs-core/issues">Issues</a>
	</p>
</div>

<br>

<!-- TABLE OF CONTENTS -->
<details>
<summary>Table of Contents</summary>
	<ol>
		<li><a href="#what-is-koppajs">What is KoppaJS?</a></li>
		<li><a href="#features">Features</a></li>
		<li><a href="#getting-started">Getting Started</a></li>
		<li><a href="#roadmap">Roadmap</a></li>
		<li><a href="#support">Support</a></li>
		<li><a href="#community--contribution">Community & Contribution</a></li>
		<li><a href="#license">License</a></li>
	</ol>
	<br>
</details>

## What is KoppaJS?

> *Oh no, not another frontend framework!*

That’s probably what you're thinking — and fair enough.

The world of frontend is crowded, opinionated, and often driven more by complexity than clarity.  
KoppaJS was built in quiet defiance of that trend – with a clear goal:  
To give developers back their time, control, and the joy of simply building things that work.

**KoppaJS** is a minimal, performance-oriented framework designed for:

- Freelancers & indie hackers  
- Agencies shipping fast MVPs  
- Developers who dislike unnecessary abstraction  

Built from scratch to prioritize:

- **Clarity over convention**  
- **Speed without complexity**  
- **Control instead of hidden layers**

Whether you're prototyping, building full apps, or crafting interactive components — KoppaJS gives you the tools without the noise.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Features

Here's what makes KoppaJS feel different:

- **Direct DOM Access** – no virtual DOM, no hidden layers, no runtime traps  
- **Functional & Modular** – no classes, no boilerplate, just clean composition  
- **Single File Components** – `.kpa` format for clarity, cohesion, and flow  
- **Proxy-based Reactivity** – minimal, referential, and lightning-fast  
- **Powerful Lifecycle Hooks** – predictable, composable, deeply integrated  
- **Plugins & Modules** – share logic without entanglement  
- **Type-safe & HMR-ready** – built for modern Vite + TypeScript workflows

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

KoppaJS is designed to help you build fast, modular web interfaces without unnecessary overhead.
This section shows two ways to get started: using the official example or installing manually.

> Want to go deeper? → See [Installation](#installation) or [Roadmap](#roadmap).

<br>

### Quickstart

Start a new KoppaJS project in seconds using the official example repository [koppajs/koppajs-example](https://github.com/koppajs/koppajs-example):

```bash
git clone https://github.com/koppajs/koppajs-example.git my-app
cd my-app
pnpm install
pnpm run dev
```

> Open `http://localhost:5173` and start building with KoppaJS.

<br>

### Installation

To integrate KoppaJS into an existing project, you’ll need both the core framework **and** the official Vite plugin to support `.kpa` Single File Components:

```bash
pnpm add @koppajs/koppajs-core
pnpm add @koppajs/koppajs-vite-plugin -D
```

***1. Configure Vite (`vite.config.ts`)***

```ts
import { defineConfig } from 'vite'
import koppajs from '@koppajs/plugin-vite'

export default defineConfig({
  plugins: [koppajs()]
})
```

***2. Set up your entry file (`main.ts`)***

```ts
import { koppajs } from '@koppajs/koppajs-core'
import BtnCount from './components/btn-count.kpa'

koppajs.take(BtnCount, 'btn-count')
koppajs()
```

***3. Create a `.kpa` Single File Component***

```html
[template]
  <button class="btn" onClick="increment">Count: {{ count }}</button>
[/template]

[js]
  return {
    data: { count: 0 },
    methods: {
      increment() {
        this.count++
      }
    }
  }
[/js]

[css]
  .btn {
    padding: 0.5rem 1rem;
    background: #007acc;
    color: white;
    border: none;
    border-radius: 4px;
  }
[/css]
```

***4. Reference the component in your HTML (`index.html`)***

```html
<body>
  <btn-count></btn-count>
</body>
```

> `.kpa` support is only available with the official Vite plugin.
> It enables parsing and transformation of`.kpa` files.

For more examples, advanced setups, and full API reference, visit the [Documentation](https://github.com/koppajs/koppajs-documentation).

**Coming soon**: A dedicated CLI tool will make it even easier to scaffold a new KoppaJS project with everything preconfigured – including the core package, Vite plugin, and a ready-to-run project setup.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

Planned extensions and enhancements for the evolving KoppaJS ecosystem are outlined below – from core tooling to developer experience.

- Router module (in progress)  
- Store module (in progress)  
- Consent / Cookiebanner module (in progress)  
- Vite Plugin for transforming .kpa (in progress)  
- VSCode extension for `.kpa` highlighting (in progress)  
- CLI scaffolding tool (planned)  
- SSR/SSG support (planned)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Support

If you're using KoppaJS and need help:

- Check the [Documentation](https://github.com/koppajs/koppajs-documentation)  
- Report issues on [GitHub](https://github.com/koppajs/koppajs-core/issues)  
- Open a discussion or suggest ideas

> Your feedback helps improve KoppaJS. Thank you!

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Community & Contribution

We welcome PRs, questions, and ideas!

- Contributing guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md)  
- Code of Conduct: [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)  
- Open issues, suggest improvements, or share feedback

> Make small PRs, write tests if needed, and explain your reasoning.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

_Thanks for reading. Now go build something that feels good to build._

## License

Apache License Version 2.0 – Free for commercial and open-source use.

© 2025 · KoppaJS, Bastian Bensch

<p align="right">(<a href="#readme-top">back to top</a>)</p>
