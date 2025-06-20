// src/index.ts

import { extend, isComponentSource, isModule, isPlugin } from './utils';
import { GlobalHooks } from './utils/global-hooks';
import { ExtensionRegistry } from './utils/extension-registry';
import { registerComponent } from './component';

import type { CoreCallable, CoreCtx, TakeArgs } from './types';

extend();

let initialized = false;
let queuedTakes: TakeArgs[] = [];

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

export const Core = (() => {
  const callable = Object.assign(() => initialize(), {
    take: (...args: TakeArgs) => {
      if (initialized) {
        performTake(...args);
      } else {
        queuedTakes.push(args);
      }
    },
  }) satisfies CoreCallable;

  return callable;
})();
