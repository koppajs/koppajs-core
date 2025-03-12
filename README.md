<div align="center">
    <a href="https://koppajs.org" target="_blank">
        <img width="180" src="https://avatars.githubusercontent.com/u/202870041?s=400&u=1297d4d69f48dd24d51dd1bd53d4cf576c7a1f21&v=4" alt="koppajs Logo">
    </a>
</div>
<br>
<div align="center">
    <a href="https://npmcharts.com/compare/@koppajs/core?minimal=true" target="_blank">
        <img src="https://badgen.net/npm/dm/@koppajs/core?scale=1&color=69DF20" alt="Downloads">
    </a>
    <a href="https://www.npmjs.com/package/@koppajs/core">
        <img src="https://badgen.net/npm/v/@koppajs/core?scale=1&color=4AC56D" alt="Version">
    </a>
    <a href="http://opensource.org/licenses/MIT" target="_blank">
        <img src="https://badgen.net/badge/license/MIT/?scale1&color=2eaad1" alt="License">
    </a>
</div>

<br><br>

# 🚀 koppajs – The UI framework for pragmatic developers – lightweight, fast & modular.

No virtual DOM, no overhead – just pure performance & full control. Direct DOM manipulation, proxy reactivity & only the features you need.

## 📌 1. What is koppajs?

**koppajs** is a lightweight, modular, and high-performance UI framework specifically designed for **SMEs, freelancers, and indie developers**.

### Key aspects of koppajs:

- **No Virtual DOM** → Direct DOM manipulation with proxy reactivity
- **Vite integration** → Superfast development
- **Single-File Components** → `.kpa` files (similar to `.vue`)
- **Modular architecture** → Router, Store, CLI, and more modules
- **SSR (planned)** → Expandability for server-side rendering
- **CLI-supported setup** → Quick start for new projects
- **Simple syntax & API** → Reducing complexity to the essentials
- **Perfect for modern web projects** → Especially for SMEs and small to medium-sized apps

🌟 **Vision:** koppajs aims to be a lean alternative to Vue.js, React, and Svelte, focusing on performance & simplicity.

## 💡 Key Features:

- **No Virtual DOM** – Direct DOM manipulation with proxy reactivity
- **Fast & efficient** – Minimal abstraction, maximum performance
- **Component-based** – `.kpa` files for Single File Components
- **Modular extendability** – Soon an ecosystem of official and custom modules
- **Seamless integration with Vite** – Easy setup for blazing-fast development

🔥 **Why koppajs?**  
Because it delivers the **essence** of modern web development without unnecessary complexity. A **lightweight core** that can be expanded with modules & plugins – **as much as needed, as little as possible**.

## 🛠 Architecture & Concept

### Modularity & Core Components

koppajs relies on a small core that can be expanded with modules & plugins anytime:

| Module                        | Status            | Description                          |
| ----------------------------- | ----------------- | ------------------------------------ |
| **koppajs-core**              | ✅ Stable         | Core engine of koppajs               |
| **koppajs-vite-plugin**       | 🚧 In development | Vite support for `.kpa` files        |
| **koppajs-cli**               | 🚧 In development | CLI for quick project initialization |
| **koppajs-router**            | 🔄 Under revision | Client-side routing for SPAs         |
| **koppajs-store**             | 🔄 Under revision | State management                     |
| **koppajs-component-library** | 📌 Planned        | UI library similar to Vuetify        |

### Reactive Concept

- **No Virtual DOM** → No unnecessary performance costs
- **Proxy-based reactivity** → Direct DOM manipulation on changes
- **Components have their own instances** → Data context remains isolated
- **Direct access to DOM** → Immediate rendering

## 📦 Installation & Quick Start

### Creating a new koppajs project

With npm:

```sh
npm create koppa@latest my-project
cd my-project
npm install
npm run dev
```

With pnpm:

```sh
pnpm create koppa@latest my-project
cd my-project
pnpm install
pnpm run dev
```

With Yarn:

```sh
yarn create koppa@latest my-project
cd my-project
yarn install
yarn dev
```

This sets up a pre-configured **project**.

## 📂 Project Structure

A typical koppajs project follows this structure:

```
my-project/
│── src/
│   ├── components/
│   │   ├── my-component.kpa
│   ├── main.ts
│   ├── modules/
│   │   ├── router.ts
│   ├── assets/
│   │   ├── css/
│   │   │   ├── base.css
│── public/
│── index.html
│── vite.config.ts
│── package.json
```

## 📌 Basics – Components with .kpa Files

koppajs uses **Single File Components (SFC)** similar to Vue, but in a lightweight and optimized way.

Supported: HTML, JavaScript, TypeScript, CSS & SCSS

**Example of a Koppa component (components/my-component.kpa)**:

```html
    [template]
        <div>
            <h1>{{ title }}</h1>
            <button onClick="changeTitle">Change Title</button>
        </div>
    [/template]

    [ts]
        return {
            data: {
            title: "Hello koppajs!"
            },
            methods: {
            changeTitle() {
                this.title = "koppajs is awesome!";
            }
            }
        };
    [/ts]

    [css]
        div {
            text-align: center;
        }
        button {
            background-color: blue;
            color: white;
        }
    [/css]
```

This `.kpa` file contains **template, logic, and styles** in a single file.

## 🔄 Lifecycle Hooks

Every component in koppajs goes through the following phases:

1. **created()** – Before DOM binding.
2. **beforeMount()** – Just before being added to the DOM.
3. **mounted()** – Once the component is in the DOM.
4. **updated()** – Triggered when data changes.
5. **beforeDestroy()** – Before the component is removed.
6. **destroyed()** – After complete removal from the DOM.

## 🚀 koppajs vs. Other Frameworks

| Feature                | koppajs                | Vue.js   | React.js         | Angular        | Svelte   |
| ---------------------- | ---------------------- | -------- | ---------------- | -------------- | -------- |
| Virtual DOM            | ❌ No                  | ✅ Yes   | ✅ Yes           | ✅ Yes         | ❌ No    |
| Single File Components | ✅ Yes                 | ✅ Yes   | ❌ No            | ❌ No          | ✅ Yes   |
| Reactivity             | ✅ Proxy-based         | ✅ Proxy | ❌ useState()    | ❌ Zone.js     | ✅ Proxy |
| Modularity             | ✅ Yes (CLI & Modules) | ✅ Yes   | ❌ Hooks & Redux | ❌ Monolithic  | ✅ Yes   |
| SSR support            | 🔄 Planned             | ✅ Yes   | ✅ Yes           | ✅ Yes         | ✅ Yes   |
| Performance            | 🚀 Extremely fast      | ⚡ Fast  | 🏎️ Medium        | 🏢 Heavyweight | 🚀 Fast  |

👉 **Conclusion**: koppajs is a **lightweight and high-performance alternative**, perfect for **fast and scalable web projects**.

## 📜 License

This project is licensed under the **Apache License Version 2.0** – it is free to use, modify, and extend.

© 2025 | **Bensch Web Services**
