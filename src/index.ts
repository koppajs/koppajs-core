// 📁 `src/index.ts`
/// <reference path="./globals.d.ts" />

import Component from './Component';
import { extendPrototypes, generateCompactUniqueId } from './utils';
import { GlobalHooks } from './utils/GlobalHooks';
import ExtensionRegistry from './ExtensionRegistry';

// Enhance native prototypes with additional utility functions
extendPrototypes();

// Unique identifier to enforce singleton initialization
const identifier = generateCompactUniqueId();

class Core {
  // Singleton instance
  private static instance: Core;
  // Queue for `take()` calls made before initialization
  private static queuedTakes: [extension: ComponentSource | IPlugin | IModule, name?: string][] =
    [];

  constructor(input?: string) {
    if (Core.instance) return Core.instance;

    if (identifier === input) {
      Core.instance = this;

      // Process any `take()` calls made before initialization
      Core.queuedTakes.forEach(([arg1, arg2]) => this.take(arg1, arg2));
      Core.queuedTakes = [];
    }

    return Core.instance ?? this;
  }

  public static getInstance(): Core {
    return Core.instance ?? (Core.instance = new Core(identifier));
  }

  public take(extension: ComponentSource | IPlugin | IModule, name?: string): void {
    // 1) ComponentSource
    if (name && this.isComponentSource(extension)) {
      ExtensionRegistry.components[name] = new Component(name, extension);
      return;
    }

    // 2) Plugin
    if (this.isPlugin(extension)) {
      const ctx: CoreCtx = {
        registerHook: GlobalHooks.register,
        take: this.take,
      };
      const cleanup = extension.install(ctx);
      ExtensionRegistry.plugins[extension.name] = extension;
      cleanup?.();
      return;
    }

    // 3) Module
    if (this.isModule(extension)) {
      const ctx: CoreCtx = { registerHook: GlobalHooks.register };
      const cleanup = extension.initialize(ctx); // oder attach()
      ExtensionRegistry.modules[extension.name] = extension;
      cleanup?.();
      return;
    }

    console.error('❌ Unknown extension type:', extension);
  }

  private isComponentSource(extension: any): extension is ComponentSource {
    const { template, script, style } = extension ?? {};
    return typeof template === 'string' && typeof script === 'string' && typeof style === 'string';
  }

  private isPlugin(ext: any): ext is IPlugin {
    return ext?.type === 'plugin' && typeof ext.install === 'function';
  }
  private isModule(ext: any): ext is IModule {
    return ext?.type === 'module' && typeof ext.initialize === 'function';
  }
}

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

export type CoreType = Core;
export type CoreProxyType = (new (input?: string) => CoreType) & CoreType;

export default CoreProxy;
