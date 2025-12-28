import { extend, hookOn, isComponentSource, isModule, isPlugin } from "./utils";
import { ExtensionRegistry } from "./utils/extension-registry";
import { registerComponent } from "./component";
import {
  patchGlobalEventTracking,
  startGlobalDisconnectionObserver,
} from "./global-event-cleaner";

import type { CoreCallable, CoreCtx, TakeArgs } from "./types";

// Public Types
export type {
  ComponentSource,
  ComponentInstance,
  ComponentController,
  ComponentContext,
  CoreCallable,
  CoreCtx,
  IPlugin,
  IModule,
  TakeArgs,
  Props,
  Events,
  Data,
  Refs,
  Methods,
  LifecycleHook,
} from "./types";

let initialized = false;
let domInitialized = false;
let queuedTakes: TakeArgs[] = [];

export function initDomEnvironment(): void {
  if (domInitialized) return;
  domInitialized = true;

  if (typeof document === "undefined" || typeof HTMLElement === "undefined") {
    return;
  }

  patchGlobalEventTracking();
  extend();
  startGlobalDisconnectionObserver();
}

function performTake(...args: TakeArgs): void {
  const ext = args[0];
  const name = args[1];

  if (isComponentSource(ext)) {
    if (!name) {
      console.error("ComponentSource requires a component name when calling take()");
      return;
    }
    registerComponent(name, ext);
    return;
  }

  if (isPlugin(ext) || isModule(ext)) {
    const ctx: CoreCtx = {
      registerHook: (hookName, callback) => {
        hookOn("global", hookName, callback);
      },
      take: Core.take,
    };

    ext.install(ctx);

    if (isPlugin(ext)) {
      ExtensionRegistry.plugins[ext.name] = ext;
    } else {
      ExtensionRegistry.modules[ext.name] = ext;
    }

    return;
  }

  console.error("❌ Unknown extension type:", ext);
}

function initialize(): void {
  if (initialized) return;
  initialized = true;

  queuedTakes.forEach((args) => performTake(...args));
  queuedTakes = [];

  console.log("🚀 Core initialized");
}

export const Core = (() => {
  const callable = Object.assign(
    () => {
      initDomEnvironment();
      initialize();
    },
    {
      take: (...args: TakeArgs) => {
        if (initialized) performTake(...args);
        else queuedTakes.push(args);
      },
    },
  ) satisfies CoreCallable;

  return callable;
})();
