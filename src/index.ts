// --- KoppaJS Core Public API ---
// Only exports intended for stable, public use are exposed here.

import { logger } from "./utils/logger";
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
  ModuleContext,
  TakeArgs,
  Props,
  Events,
  State,
  Refs,
  Methods,
  LifecycleHook,
} from "./types";

/**
 * KoppaJS logger singleton and log level enum.
 * @public
 */
export { logger, LogLevel } from "./utils/logger";

// --- Internal implementation below ---
// (not exported)
import { extend, hookOn, isComponentSource, isModule, isPlugin } from "./utils";
import { ExtensionRegistry } from "./utils/extension-registry";
import { registerComponent } from "./component";
import {
  patchGlobalEventTracking,
  startGlobalDisconnectionObserver,
} from "./global-event-cleaner";

let initialized = false;
let domInitialized = false;
let queuedTakes: TakeArgs[] = [];

/**
 * Initializes the DOM environment for KoppaJS.
 *
 * - Patches global event tracking
 * - Extends HTMLElement with KoppaJS helpers
 * - Starts disconnection observer
 *
 * Safe to call multiple times (idempotent).
 *
 * @public
 */
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

/**
 * Performs the take operation for a component, plugin, or module.
 * @param args - Either [ComponentSource, name] or [IPlugin | IModule]
 */
function performTake(...args: TakeArgs): void {
  const ext = args[0];
  const name = args[1];

  if (isComponentSource(ext)) {
    if (!name) {
      logger.error(
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

    try {
      ext.install(ctx);

      if (isPlugin(ext)) {
        ExtensionRegistry.plugins[ext.name] = ext;
      } else {
        ExtensionRegistry.modules[ext.name] = ext;
      }
    } catch (error) {
      logger.errorWithContext(
        "Failed to install extension",
        { name: ext.name, type: isPlugin(ext) ? "plugin" : "module" },
        error,
      );
    }

    return;
  }

  logger.error("Unknown extension type", ext);
}

/**
 * Initializes the core framework.
 * Processes all queued take operations and marks core as initialized.
 * Safe to call multiple times (idempotent).
 */
function initialize(): void {
  if (initialized) return;
  initialized = true;

  queuedTakes.forEach((args) => performTake(...args));
  queuedTakes = [];

  logger.info("Core initialized");
}

/**
 * Main KoppaJS Core API.
 *
 * - Call as a function to initialize the framework (processes all registrations)
 * - Use `Core.take()` to register components, plugins, or modules before initialization
 *
 * @example
 *   import { Core } from '@koppajs/koppajs-core';
 *   Core.take(MyComponent, 'my-component');
 *   Core();
 *
 * @public
 */
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
