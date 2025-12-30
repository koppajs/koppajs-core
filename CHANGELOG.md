# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/)
and follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) standard.

---

## [3.0.0] – 2025-01-30

### Added

- Fully class-free, factory-free, and virtual-DOM-free architecture
- Component system based on native Web Components
- Reactive data model with proxy‑based change detection
- Custom event system with bubbling and scoped delegation
- Comprehensive lifecycle hooks (`created`, `processed`, `beforeMount`, `mounted`, `beforeUpdate`, `updated`, `beforeDestroy`, `destroyed`)
- Inline template directives: `loop`, `if`, `else`, `ref`, `slot`
- Text and attribute interpolation using `{{ expression }}`
- Declarative slot system for component composition
- Prop binding by reference (`:prop="data.value"`)
- Plugin and module registries for modular extension
- Strong typing throughout the framework (`satisfies`‑based validation)
- Dedicated TypeScript config for public type generation
- Vitest testing framework with KoppaJS custom “Three Test Rule”
- Tooling setup with pnpm, Vite, ESLint (flat config), and Prettier
- Build pipeline including typecheck → bundle → type generation
- Utilities for DOM helpers, script evaluation, deep reactivity, and loop/if template processing

### Changed

- Internal utilities reorganized for clarity
- Lifecycle and rendering logic made fully modular
- Improved separation of concerns across `utils/*`
- More predictable update cycle via referential data model
- Enhanced readability and structure of component registration flow

### Removed

- All class‑based structures
- All factory-style abstractions
- Any hidden or implicit lifecycle mechanics

### Testing

- Introduced "Three Test Rule":
  - Valid case
  - Error case
  - Logical edge case
- Test structure now mirrors the source folder
- No global mocks — each test is isolated
- Comprehensive test coverage: 78% statements, 68% branches, 90% functions, 80% lines
- 248 tests across 17 test files
- Test setup with logger suppression for clean test output
- Full component registration and lifecycle testing

### Tooling

- ESLint (flat config) enforces code quality
- Prettier defines consistent formatting rules
- Commitlint + Husky ensure clean commit messages
- Project scripts for code dumps, analysis, and type generation added
- Vitest test setup with automatic logger level suppression
- Comprehensive test coverage reporting with v8 provider

### Fixed

- TypeScript type errors in test files (IPlugin attach property)
- WeakMap iteration issues in model proxy cache
- Test output cleanup with logger level management

---
