<div>
    <br><br>
    <img src="./src/assets/images/logo-long.png" width="600">
    <br><br><br><br>
</div>

# ⚡ koppajs – The UI framework for pragmatic developers – lightweight, fast & modular.

I know what you're thinking: *"Not another single-page frontend framework!"*  
But **koppajs** is different. It's built for **speed, simplicity, and control** – without unnecessary complexity.

## 🚀 No virtual DOM, no overhead – just pure performance.

Direct DOM manipulation, proxy-based reactivity, and only the features you actually need. No abstractions that slow you down, just a **lean, efficient** way to build modern web apps.

## 📌 1. What is koppajs?

⚡ **koppajs** is a **lightweight, modular, and high-performance UI framework**, designed for **SMEs, freelancers, and indie developers** who value speed and simplicity.

🔥 **Why koppajs?**  
Because it delivers the **essence** of modern web development—nothing more, nothing less. A **lightweight core** that stays out of your way but **scales when you need it**.  
**As much as necessary, as little as possible.**

---

### Key aspects of koppajs:

- **No Virtual DOM** → Direct DOM rendering with **ultra-fast proxy reactivity**  
- **Modular Architecture** → **Flexible & extensible** through modules, components & plugins  
- **Single-File Components** → `.kpa` files for **maximum simplicity & clarity**  
- **Simple Syntax & API** → **Reduced to the essentials**, no unnecessary complexity  
- **Optimized for Speed** → **Minimal overhead**, maximum performance **through direct DOM & efficient re-rendering**  
- **Seamless Data Handling** → **Extremely simple state & data flow** between components  
- **Pragmatic & Elegant** → **Completely rethought**: **Simplicity as a core principle**, no unnecessary abstractions  
- **Developer-Friendly** → **Seamless Vite integration** for **blazing-fast Hot Module Replacement (HMR) & instant feedback**
- **Built for Real-World Use** → Especially designed for **quick development cycles & fast delivery**  

🌟 **Vision:** koppajs is built as a lightweight, high-performance alternative to traditional UI frameworks, emphasizing simplicity and speed.

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

## ⚡ koppajs vs. Other Frameworks

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
