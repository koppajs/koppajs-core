// 📁 `src/index.ts`
/// <reference path="./globals.d.ts" />

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
 * It also holds the global plugin hooks for extending lifecycle behavior.
 */
class Core {
  // Registered modules as self-contained units providing specific functionality
  public modules: Record<string, Function | Object> = {};
  // Registered plugins that extend or modify the core behavior
  public plugins: Record<string, IPlugin> = {};
  // Registered custom components
  public components: Record<string, Component> = {};
  // Active component instances
  public instances: Record<string, Instance> = {};
  // Singleton instance
  private static instance: Core;
  // Queue for `take()` calls made before initialization
  private static queuedTakes: [any, string?][] = [];

  // Global plugin hooks; each hook maps to an array of functions to be executed
  private pluginHooks: Partial<Record<LifecycleHook, Function[]>> = {};

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
   * Asynchronously calls all functions registered for the specified lifecycle hook.
   *
   * Iterates over each hook function and awaits its result if it returns a Promise.
   *
   * @param {LifecycleHook} hook - The name of the lifecycle hook.
   * @param {...any} args - Arguments to pass to each hook function.
   * @returns {Promise<void>} A promise that resolves when all hook functions have been executed.
   */
  private callPluginHook = async (instanceContext: Data, hook: LifecycleHook): Promise<void> => {
    const hooks = this.pluginHooks[hook];
    if (!hooks) return;
    for (const hookFn of hooks) {
      const result = hookFn.call(instanceContext);
      // Await the result only if it is a Promise (even if it's Promise<void>)
      if (result && typeof result.then === 'function') {
        await result;
      }
    }
  };

  /**
   * Registers a new function to be called when the specified lifecycle hook is fired.
   *
   * @param {LifecycleHook} hook - The lifecycle hook to register the function for.
   * @param {(...args: any[]) => any} hookFn - The callback function to register.
   */
  public registerPluginHook = (hook: LifecycleHook, hookFn: (...args: any[]) => any): void => {
    if (!this.pluginHooks[hook]) {
      this.pluginHooks[hook] = [];
    }
    this.pluginHooks[hook]!.push(hookFn);
  };

  /**
   * Retrieves the singleton instance, creating it if necessary.
   *
   * @returns {Core} The singleton Core instance.
   */
  public static getInstance(): Core {
    return Core.instance ?? (Core.instance = new Core(identifier));
  }

  /**
   * Registers a module.
   *
   * Modules are self-contained units that provide specific functionality or data processing.
   *
   * @param {object} module - A module object that contains a name and additional properties.
   */
  private registerModule(module: { name: string; [key: string]: any }): void {
    this.modules[module.name] = module;
  }

  /**
   * Registers a plugin.
   *
   * Plugins receive the core context and can perform global extensions or modifications.
   *
   * @param {IPlugin} plugin - A plugin conforming to the IPlugin interface.
   */
  private registerPlugin(plugin: IPlugin): void {
    // Immediately install the plugin so that it integrates with the core.
    plugin.install({
      registerPluginHook: this.registerPluginHook,
      take: this.take,
    });
    this.plugins[plugin.name] = plugin;
  }

  /**
   * Unified method for registering components, modules, or plugins.
   *
   * If the item has an install method, it is treated as a plugin;
   * if it is recognized as a ComponentSource, it is registered as a component;
   * otherwise, if it has a name, it is registered as a module.
   *
   * @param {any} item - The item to register.
   * @param {string} [name] - Optional name used primarily for components.
   */
  public take = (item: any, name?: string): void => {
    if (!Core.instance) {
      Core.queuedTakes.push([item, name]);
      return;
    }

    if (this.isComponentSource(item)) {
      this.components[name!] = new Component(
        {
          callPluginHook: this.callPluginHook,
        },
        name!,
        item,
      );
    } else if (this.isPlugin(item)) {
      // If the item is a plugin (i.e., has an install method)
      this.registerPlugin(item);
    } else if (item && item.name) {
      this.registerModule(item);
    } else {
      console.error('❌ Unknown type for registration:', item);
    }
  };

  /**
   * Determines whether the given object is a valid ComponentSource.
   *
   * @param {any} obj - Object to check.
   * @returns {boolean} True if the object is a valid ComponentSource, false otherwise.
   */
  private isComponentSource(obj: any): obj is ComponentSource {
    return obj && typeof obj.path === 'string' && typeof obj.template === 'string';
  }

  /**
   * Determines whether the given object is a valid plugin.
   *
   * A plugin is identified by the presence of an `install` method.
   *
   * @param {any} obj - Object to check.
   * @returns {boolean} True if the object is a valid plugin, false otherwise.
   */
  private isPlugin(obj: any): boolean {
    return obj && typeof obj.install === 'function';
  }
}

/**
 * Lazy-Loading Proxy for Core.
 *
 * This proxy defers the creation of the Core instance until it is needed.
 * It also enables calls to `take()` even before the framework is fully initialized.
 *
 * When instantiating via "new CoreProxy(...)", the proxy always returns the singleton instance.
 */
const CoreProxy = new Proxy(Core, {
  construct(_target, _args) {
    // Always return the singleton instance when the proxy is constructed.
    return Core.getInstance();
  },
  get(_target, prop, _receiver) {
    const instance = Core.getInstance();
    if (prop === 'take') {
      return (...args: [any, string?]) => instance.take(...args);
    }
    return instance[prop as keyof Core];
  },
}) as unknown as CoreProxyType;

window.koppa = CoreProxy;
export default CoreProxy;
