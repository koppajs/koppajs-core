# KoppaJS Core – Public API Reference

This document lists the **frozen, stable public API** of `@koppajs/koppajs-core` as of January 2026. Only the exports listed here are covered by semantic versioning guarantees. All other exports are considered internal and may change at any time.

---

## Main API

### `Core`
- **Type:** `CoreCallable`
- **Usage:**
  - `Core.take(Component, 'name')` – Register a component
  - `Core.take(PluginOrModule)` – Register a plugin or module
  - `Core()` – Initialize the framework (processes all registrations)

**⚠️ Registration Order:** Components must be registered in dependency order (children before parents). If a parent component uses child components, register the children first.

**Example:**
```typescript
import { Core } from '@koppajs/koppajs-core';
import ChildComponent from './child.kpa';
import ParentComponent from './parent.kpa';

// Correct order: child first, then parent
Core.take(ChildComponent, 'child-component');
Core.take(ParentComponent, 'parent-component');
Core(); // Initialize
```

### `initDomEnvironment()`
- Initializes DOM helpers and event tracking. Safe to call multiple times.

### `logger`, `LogLevel`
- Logging singleton and log level enum for framework and app use.

---

## Component Controller API

When creating a component, the script block must return an object with the following optional properties:

### Controller Object Shape

```typescript
{
  state?: Record<string, any>;        // Reactive state properties
  methods?: Record<string, Function>; // Methods (bound to component context)
  mounted?: () => void;               // Called after component is mounted to DOM
  unmounted?: () => void;             // Called before component is removed from DOM
  updated?: () => void;               // Called after state changes cause DOM updates
}
```

### Updates for January 2026
- **New Feature:** Added support for `beforeUpdate` lifecycle method.
- **Enhancement:** Improved type definitions for `state` and `methods`.
- **Breaking Change:** `logger` now requires explicit initialization.

### Component Context

Inside component controllers, the following special variables are available:

#### `this`
- Bound to component state and methods
- Example: `this.count++`, `this.myMethod()`

#### `$refs`
- Access to elements marked with `ref="name"` attribute in the template
- Type: `Record<string, Element>`
- Example: `$refs.myInput.focus()`

#### `$props`
- Component props passed from parent (read-only)
- Type: `Props` (Record<string, any>)
- Example: `$props.title`

#### `$router` (if router module installed)
- Router API for navigation
- Methods:
  - `push(path: string)` - Navigate to path
  - `replace(path: string)` - Replace current route
  - `back()` - Go back in history
  - `forward()` - Go forward in history
  - `currentRoute` - Current route information
  - `params` - Route parameters
  - `query` - Query parameters

#### `$module` (varies by installed modules)
- Module-specific API attachments
- Available when modules with `attach()` methods are installed

### Event Binding Convention

Event handlers in templates use the `on` prefix with PascalCase event names:

```html
<!-- onClick binds to native 'click' event -->
<button onClick="handleClick">Click me</button>

<!-- onInput binds to native 'input' event -->
<input onInput="handleInput" />

<!-- onMouseOver binds to native 'mouseover' event -->
<div onMouseOver="handleHover">Hover me</div>
```

The framework automatically:
1. Converts `onClick` → `click` (removes 'on', lowercases)
2. Looks up the method name in component's `methods` object
3. Binds the method with the component context as `this`

---

## Types
- `ComponentContext`
- `ComponentController`
- `ComponentInstance`
- `ComponentSource`
- `CoreCallable`
- `CoreCtx`
- `IModule`
- `IPlugin`
- `ModuleContext`
- `TakeArgs`
- `Props`
- `Events`
- `State`
- `Refs`
- `Methods`
- `LifecycleHook`

---

## Module Interface

Modules must implement the `IModule` interface:

```typescript
interface IModule {
  name: string;                              // Unique module name
  install?: (context: CoreCtx) => void;      // Called once during Core() initialization
  attach?: (this: ModuleContext) => any;     // Return value accessible via $module
}
```

**Guarantees:**
- `install()` is called once when `Core()` is invoked
- `attach()` return value is made available in component context
- Module names must be unique

---

## Utilities (Advanced)

### `ExtensionRegistry`
- Global registry for plugins and modules (advanced/extensibility use).

### `extend()`
- Installs KoppaJS helpers on global prototypes (Object, HTMLElement).

### `reconcileDOM()`
- Low-level DOM reconciliation utility for advanced scenarios.

### `domExtensions`, `objectExtensions`
- Property descriptors for prototype extension (advanced use only).

---

## Integration with Vite Plugin

### ComponentSource Contract

The Vite plugin produces `ComponentSource` objects with this structure:

```typescript
interface ComponentSource {
  contractVersion: string;           // Module contract version
  path: string;                      // Normalized path to .kpa file
  template: string;                  // HTML template (may be empty)
  style: string;                     // Compiled CSS (may be empty)
  script: string;                    // Wrapped function: '(() => { code })()'
  scriptMap: object | null;          // Source map
  deps: Record<string, () => Promise<unknown>>; // Dynamic imports
  structAttr: string;                // Attribute name for reconciliation
}
```

For detailed integration contracts, see [Integration Contracts Documentation](https://github.com/koppajs/koppajs-example/blob/main/INTEGRATION_CONTRACTS.md).

---

## Not Public API
- All other exports (helpers, type-guards, identity, etc.) are **internal** and not covered by semver. Import directly at your own risk.

---

For full usage and examples, see the [README](./README.md) and [Documentation](https://github.com/koppajs/koppajs-documentation).
