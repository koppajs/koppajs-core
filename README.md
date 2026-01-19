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
	</ol>
</details>

---

## What is KoppaJS?

KoppaJS is a lightweight, modular frontend framework designed to simplify development without sacrificing flexibility. It provides a pragmatic approach to building modern web applications, focusing on:

- **Simplicity:** Minimal boilerplate and intuitive APIs.
- **Performance:** Optimized for speed and scalability.
- **Modularity:** Build only what you need, when you need it.

---

## Features

- **Declarative Components:** Define components with `.kpa` files.
- **Reactive State Management:** Built-in reactivity for seamless updates.
- **Lifecycle Hooks:** Control component behavior with hooks like `mounted`, `updated`, and `beforeUpdate`.
- **Integration-Friendly:** Works with existing tools and libraries.
- **TypeScript Support:** First-class TypeScript support for safer, more maintainable code.

---

## Getting Started

To get started with KoppaJS, follow these steps:

1. **Install the Core Library:**
   ```bash
   pnpm add @koppajs/koppajs-core
   ```

2. **Create Your First Component:**
   ```typescript
   import { Core } from '@koppajs/koppajs-core';

   Core.take({
     state: { count: 0 },
     methods: {
       increment() {
         this.state.count++;
       },
     },
   }, 'counter');

   Core();
   ```

3. **Run Your Application:**
   Use your favorite bundler or the KoppaJS Vite plugin to build and serve your app.

---

## Roadmap

- **Q1 2026:** Enhanced debugging tools and improved documentation.
- **Q2 2026:** Experimental support for server-side rendering (SSR).
- **Q3 2026:** Advanced state management features.

---

## Support

For support, visit our [GitHub Issues](https://github.com/koppajs/koppajs-core/issues) or join our community on [Discord](https://discord.gg/koppajs).

---

## Community & Contribution

We welcome contributions! Check out our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.
