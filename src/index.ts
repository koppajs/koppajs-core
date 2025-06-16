// src/index.ts

import { extend } from './utils';
import { GlobalHooks } from './utils/global-hooks';
import { ExtensionRegistry } from './utils/extension-registry';
import { registerComponent } from './component';

import type { ComponentSource, CoreCallable, CoreCtx, IModule, IPlugin, TakeArgs } from './types';

extend();

let initialized = false;
let queuedTakes: TakeArgs[] = [];

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

function performTake(...args: TakeArgs): void {
  const ext = args[0];
  const name = args[1];

  if (isComponentSource(ext)) {
    if (!name) {
      console.error('ComponentSource erfordert einen Namen beim Aufruf von take()');
      return;
    }

    registerComponent(name, ext);
    return;
  }

  if (isPlugin(ext) || isModule(ext)) {
    const ctx: CoreCtx = {
      registerHook: GlobalHooks.on,
      take: Core.take,
    };

    // Install aufrufen
    const cleanup = ext.install(ctx);

    // In Registry speichern
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

function initialize(): void {
  if (initialized) return;
  initialized = true;

  queuedTakes.forEach((args) => performTake(...args));
  queuedTakes = [];

  console.log('🚀 Core initialized');
}

/** @public */
export const Core: CoreCallable = (() => {
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
