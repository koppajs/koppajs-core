import { extend, hookOn, isComponentSource, isModule, isPlugin } from "./utils";
import { ExtensionRegistry } from "./utils/extension-registry";
import { registerComponent } from "./component";
import {
  patchGlobalEventTracking,
  startGlobalDisconnectionObserver,
} from "./global-event-cleaner";

import type { CoreCallable, CoreCtx, TakeArgs } from "./types";

let initialized = false;
let domInitialized = false;
let queuedTakes: TakeArgs[] = [];

/**
 * Initializes all DOM-related side effects:
 * - EventTarget patching for global event tracking
 * - Prototype extensions on HTMLElement and Object
 * - A global MutationObserver for automatic event cleanup
 *
 * In Node/SSR environments this function does nothing (safe no-op).
 */
export function initDomEnvironment(): void {
  if (domInitialized) return;
  domInitialized = true;

  // No DOM available → do nothing
  if (typeof document === "undefined" || typeof HTMLElement === "undefined") {
    return;
  }

  patchGlobalEventTracking();
  extend();
  startGlobalDisconnectionObserver();
}

/**
 * Performs the actual handling of a take() call:
 * - Registers components
 * - Installs plugins/modules
 */
function performTake(...args: TakeArgs): void {
  const ext = args[0];
  const name = args[1];

  if (isComponentSource(ext)) {
    if (!name) {
      console.error(
        "ComponentSource requires a component name when calling take()",
      );
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

    // Install extension (ignore returned cleanup function for now)
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

/**
 * Initializes the core logic and flushes all queued take() calls.
 */
function initialize(): void {
  if (initialized) return;
  initialized = true;

  queuedTakes.forEach((args) => performTake(...args));
  queuedTakes = [];

  console.log("🚀 Core initialized");
}

/**
 * The main Core entry function.
 * - Calling Core() initializes DOM features and core state.
 * - Calling Core.take(...) registers components/plugins/modules.
 */
export const Core = (() => {
  const callable = Object.assign(
    () => {
      // Initialize DOM environment if available (safe in SSR)
      initDomEnvironment();
      initialize();
    },
    {
      take: (...args: TakeArgs) => {
        if (initialized) {
          performTake(...args);
        } else {
          queuedTakes.push(args);
        }
      },
    },
  ) satisfies CoreCallable;

  return callable;
})();
