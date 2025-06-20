# 📦 Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/)  
and follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

---

## [3.0.0] – 2025-06-20

### 🚀 Initial Release

The first public release of **KoppaJS Core**.  
A minimalistic, functional, and framework-agnostic frontend engine –  
designed for **clarity**, **control**, and **composability**.

### ✨ Features

- Fully **class-free**, **factory-free**, and **virtual-DOM-free**
- Component system based on **native Web Components**
- Reactive data model with **proxy-based observation**
- Custom event system with bubbling and scoped delegation
- Lifecycle hooks:
  - `created`: after instantiation, before DOM parsing
  - `processed`: after template parsing, before binding
  - `beforeMount`: right before insertion into the DOM
  - `mounted`: after DOM insertion
  - `beforeUpdate`: before reactive update
  - `updated`: after reactive re-render
  - `beforeDestroy`: before DOM removal
  - `destroyed`: after DOM removal
- Inline template directives: `loop`, `if`, `else`, `ref`, `slot`
- Text and attribute interpolation via `{{ expression }}`
- Declarative slot support for composition
- Prop binding by reference (`:prop="data.value"`)
- Modular **plugin/module registries**
- Strongly typed core with `satisfies`-based validation
- Developer-first tooling (pnpm, vite, ts-morph, vitest)

### 🧪 Testing

- Uses **Vitest** with custom rules:
  - Each function follows the “Three Test Rule” (positive / negative / edge case)
  - Always 3 test cases:  
    – Functional ("works")  
    – Failing input ("throws or misbehaves")  
    – Logical edge case ("silent misusage")
  - Tests mirror `src/` structure
  - No global mocks – each test has isolated input/output
  - Utilities and behavior modules tested individually

### 🛠️ Tooling & Scripts

- Type definitions generated via `ts-morph` with `generate:public`
- Clean, type-safe builds with `vite` and strict `tsconfig`
- Enforced commit & style rules with `Husky`, `Prettier`, `ESLint`, and `Stylelint`

### 🧹 Internal

- Fully functional architecture (no classes, no factories)
- Modular utils, isolated lifecycle and rendering logic
- Clear file boundaries and exports for all framework elements
