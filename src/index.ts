// 📁 `src/index.ts`
/// <reference path="./globals.d.ts" />

import Component from './Component';
import { extendPrototypes, generateCompactUniqueId } from './utils';
import { GlobalHooks } from './utils/GlobalHooks';
import ExtensionRegistry from './ExtensionRegistry';

// Enhance native prototypes with additional utility functions
extendPrototypes();

type TakeArgs =
  | [extension: ComponentSource, name: string] // ComponentSource braucht zwingend einen Namen
  | [extension: IPlugin | IModule]; // Plugin/Module kommt allein

// Unique identifier to enforce singleton initialization
const identifier = generateCompactUniqueId();

class Core {
  // Singleton instance
  private static instance: Core;
  // Queue for `take()` calls made before initialization
  private static queuedTakes: TakeArgs[] = [];

  constructor(input?: string) {
    if (Core.instance) return Core.instance;

    if (identifier === input) {
      Core.instance = this;

      // Process any `take()` calls made before initialization
      Core.queuedTakes.forEach((args) => this.take(...args));
      Core.queuedTakes = [];
    }

    return Core.instance ?? this;
  }

  public static getInstance(): Core {
    return Core.instance ?? (Core.instance = new Core(identifier));
  }

  public take(extension: ComponentSource, name: string): void;
  public take(extension: IPlugin | IModule): void;
  public take(...args: TakeArgs): void;
  public take(extension: IExtension, name?: string) {
    // 1) Component-Fall
    if (this.isComponentSource(extension)) {
      if (!name) {
        console.error('ComponentSource erfordert einen Namen beim Aufruf von take()');
        return;
      }
      ExtensionRegistry.components[name] = new Component(name, extension);
      return;
    }

    // 2) Plugin- oder Module-Fall
    if (this.isPlugin(extension) || this.isModule(extension)) {
      const ctx: CoreCtx = {
        registerHook: GlobalHooks.register,
        take: this.take,
      };

      const cleanup = extension.install(ctx);

      if (this.isPlugin(extension)) {
        ExtensionRegistry.plugins[extension.name] = extension;
      } else {
        ExtensionRegistry.modules[extension.name] = extension;
      }

      cleanup?.();
      return;
    }

    // 3) Unbekannter Typ
    console.error('❌ Unknown extension type:', extension);
  }

  private isComponentSource(ext: any): ext is ComponentSource {
    const { template, script, style } = ext ?? {};
    return typeof template === 'string' && typeof script === 'string' && typeof style === 'string';
  }

  private isPlugin(ext: any): ext is IPlugin {
    return typeof ext.setup === 'function' && ext.attach === undefined;
  }
  private isModule(ext: any): ext is IModule {
    return typeof ext.attach === 'function' && ext.setup === undefined;
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
      return instance.take;
    }
    return instance[prop as keyof Core];
  },
}) as unknown as CoreProxyType;

export type CoreType = Core;
export type CoreProxyType = (new (input?: string) => CoreType) & CoreType;

export default CoreProxy;
