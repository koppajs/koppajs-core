// 📁 `src/index.ts`
/// <reference path="../types.d.ts" />

import Component from './Component';
import Instance from './Instance';
import { extendPrototypes, generateCompactUniqueId } from './utils';

// Enhance native prototypes with additional utility functions
extendPrototypes();

// Unique identifier to enforce singleton initialization
const identifier = generateCompactUniqueId();

/**
 * Core class providing the main framework instance.
 *
 * Manages components, modules, and plugins while ensuring a single instance.
 */
class Core {
  /** Registered modules */
  public modules: Record<string, any> = {};
  /** Registered plugins */
  public plugins: Record<string, any> = {};
  /** Registered components */
  public components: Record<string, Component> = {};
  /** Active component instances */
  public instances: Record<string, Instance> = {};
  /** Singleton instance */
  private static instance: Core;
  /** Queue for `take()` calls made before initialization */
  private static queuedTakes: [any, string?][] = [];

  /**
   * Creates or retrieves the singleton instance.
   * If not yet initialized, processes any queued registrations.
   *
   * @param {string} [input] - Verification key for controlled initialization.
   */
  constructor(input?: string) {
    if (Core.instance) return Core.instance;

    if (identifier === input) {
      this.modules = {};
      this.plugins = {};
      this.components = {};
      this.instances = {};
      Core.instance = this;

      // Process any `take()` calls made before initialization
      Core.queuedTakes.forEach(([arg1, arg2]) => this.take(arg1, arg2));
      Core.queuedTakes = [];
    }

    return Core.instance ?? this;
  }

  /**
   * Retrieves the singleton instance, creating it if necessary.
   */
  public static getInstance(): Core {
    return Core.instance ?? (Core.instance = new Core(identifier));
  }

  /**
   * Registers a module, plugin, or component.
   * If the framework is not yet initialized, the registration is queued.
   *
   * @param {any} item - A module, plugin, or component definition.
   * @param {string} [name] - Name of the component or plugin.
   */
  public take(item: any, name?: string): void {
    if (!Core.instance) {
      Core.queuedTakes.push([item, name]);
      return;
    }

    if (this.isComponentSource(item)) {
      this.components[name!] = new Component(name!, item);
    } else if (this.isPlugin(item)) {
      item.install = item.install.bind(this);
      this.plugins[name ?? item.name] = item;
    } else {
      this.modules[item.name] = item;
    }
  }

  /**
   * Determines whether the given object is a valid ComponentSource.
   *
   * @param {any} obj - Object to check.
   */
  private isComponentSource(obj: any): obj is ComponentSource {
    return obj && typeof obj.path === 'string' && typeof obj.template === 'string';
  }

  /**
   * Determines whether the given object is a valid plugin.
   * A plugin is identified by the presence of an `install` method.
   *
   * @param {any} obj - Object to check.
   */
  private isPlugin(obj: any): boolean {
    return obj && typeof obj.install === 'function';
  }
}

/**
 * **Lazy-Loading Proxy**
 *
 * Allows `take()` calls before the framework is fully initialized.
 * Defers Core instance creation until actually needed.
 */
const CoreProxy = new Proxy({} as Core, {
  get(_target, prop) {
    const instance = Core.getInstance();

    if (prop === 'take') {
      return (...args: [any, string?]) => instance.take(...args);
    }

    return instance[prop as keyof Core];
  },
});

// Ensure `window.core` always holds the singleton proxy instance
window.koppa = CoreProxy;

// Export the proxy instance
export default CoreProxy;
