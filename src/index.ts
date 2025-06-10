// src/index.ts

import Component from './Component';
import { extendPrototypes } from './utils';
import { GlobalHooks } from './utils/global-hooks';
import ExtensionRegistry from './utils/extension-registry';
import { ComponentSource, CoreCallable, CoreCtx, IModule, IPlugin, TakeArgs } from './types';

extendPrototypes();

let initialized = false;
let queuedTakes: TakeArgs[] = [];

// 🔍 Typprüfungen
function isComponentSource(ext: any): ext is ComponentSource {
  return (
    typeof ext?.template === 'string' &&
    typeof ext?.script === 'string' &&
    typeof ext?.style === 'string'
  );
}

function isPlugin(ext: any): ext is IPlugin {
  return typeof ext?.setup === 'function' && ext?.attach === undefined;
}

function isModule(ext: any): ext is IModule {
  return typeof ext?.attach === 'function' && ext?.setup === undefined;
}

// 🔧 take()-Logik
function performTake(...args: TakeArgs): void {
  const ext = args[0];
  const name = args[1];

  if (isComponentSource(ext)) {
    if (!name) {
      console.error('ComponentSource erfordert einen Namen beim Aufruf von take()');
      return;
    }
    new Component(name, ext);
    return;
  }

  if (isPlugin(ext) || isModule(ext)) {
    const ctx: CoreCtx = {
      registerHook: GlobalHooks.on,
      take: Core.take,
    };

    const cleanup = ext.install(ctx);

    if (isPlugin(ext)) {
      ExtensionRegistry.plugins[ext.name] = ext;
    } else {
      ExtensionRegistry.modules[ext.name] = ext;
    }

    cleanup?.();
    return;
  }

  console.error('❌ Unknown extension type:', ext);
}

// 📦 Hauptfunktion: Initialisierung
function initialize(): void {
  if (initialized) return;
  initialized = true;

  queuedTakes.forEach((args) => performTake(...args));
  queuedTakes = [];

  console.log('🚀 Core initialized');
}

// 📞 Callable Singleton
const Core: CoreCallable = (() => {
  const callable = (() => initialize()) as CoreCallable;

  callable.take = (...args: TakeArgs) => {
    if (initialized) {
      performTake(...args);
    } else {
      queuedTakes.push(args);
    }
  };

  return callable;
})();

export default Core;
