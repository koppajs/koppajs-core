<div align="center">
  <img src="./src/assets/images/logo-long.png" width="600" alt="KoppaJS Logo">
</div>

# ⚡ KoppaJS – The UI framework for pragmatic developers

> _“Not another frontend framework?”_  
> Yes – but this one is different. **KoppaJS** is built for developers who want full control, blazing speed, and no unnecessary abstraction.

---

## 🌟 Vision

**KoppaJS** is a lightweight, high-performance alternative to traditional UI frameworks.  
It puts **clarity**, **speed**, and **modularity** first — empowering developers to build reactive, maintainable apps without layers of hidden complexity.

---

## 📌 What is KoppaJS?

A UI framework made for:

- 🧑‍💻 Indie developers
- 🚀 Startups
- 🛠 Freelancers
- …and anyone who wants performance without overhead

No virtual DOM. No reactivity blackboxes.  
**Just clean code, direct DOM access, and total control.**

---

## 🔥 Why KoppaJS?

- 🧠 **Clarity First** – Readable code, minimal API, no magic
- ⚡ **Direct DOM Access** – No virtual DOM, no overhead
- 🧩 **Functional & Modular** – Flat functions instead of classes
- 🪝 **Hooks & Extensibility** – Lifecycle, plugins, modules
- 📦 **Single File Components** – `.kpa` = template, logic, style in one
- 🧬 **Proxy-based Reactivity** – Lightweight and instant
- 🛠 **Modern Tooling** – TypeScript, Vite, Vitest, pnpm

---

## 🚀 Get Started

### 1. 📦 Install

```bash
pnpm add @koppajs/koppajs-core
```

---

### 2. ✨ Create a Component

#### `hello.kpa`

```html
[template]
<div>
  <h1>{{ title }}</h1>
  <button onClick="changeTitle">Change</button>
</div>
[/template] [ts] return { data: { title: "Hello KoppaJS" }, methods: { changeTitle() { this.title =
"It works!"; } } }; [/ts]
```

---

### 3. 🧩 Register & Mount

#### `src/index.ts`

```ts
import { register, mount } from '@koppajs/koppajs-core';
import Hello from './hello.kpa';

register('hello-component', Hello);
mount('hello-component', document.body);
```

---

### 4. ▶️ Start Dev Server

```bash
pnpm vite
```

> ℹ️ `.kpa` loader plugin for Vite coming soon.

---

> 🧭 Looking for a UI framework that's **transparent**, **lightweight**, and built for **speed and control**?  
> **KoppaJS** is your pragmatic companion in modern web development.

---

## 📜 License

This project is licensed under the **Apache License Version 2.0**.  
You are free to **use, modify, distribute, and extend** KoppaJS — even in commercial projects.

© 2025 · **Bensch Web Services**
