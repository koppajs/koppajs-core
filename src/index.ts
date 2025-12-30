import { extend, hookOn, isComponentSource, isModule, isPlugin } from "./utils";
import { ExtensionRegistry } from "./utils/extension-registry";
import { registerComponent } from "./component";
import {
  patchGlobalEventTracking,
  startGlobalDisconnectionObserver,
} from "./global-event-cleaner";
import { logger, LogLevel } from "./utils/logger";

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
  State,
  Refs,
  Methods,
  LifecycleHook,
} from "./types";

// Public Logger
export { logger, LogLevel } from "./utils/logger";

let initialized = false;
let domInitialized = false;
let queuedTakes: TakeArgs[] = [];

/**
 * Initializes the DOM environment.
 * Patches global event tracking, extends HTMLElement, and starts disconnection observer.
 * Safe to call multiple times (idempotent).
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
      logger.error("ComponentSource requires a component name when calling take()");
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
        error
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
 * Main Core API.
 * Call as function to initialize, or use Core.take() to register components/extensions.
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
