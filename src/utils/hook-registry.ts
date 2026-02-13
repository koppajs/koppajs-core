import type {
  State,
  HookCallback,
  LifecycleHook,
  LifecycleRegistry,
} from "../types";
import { logger } from "./logger";

/**
 * Creates a new lifecycle hook registry.
 * @returns New empty lifecycle registry
 */
export function createHookRegistry(): LifecycleRegistry {
  return new Map();
}

const globalHookRegistry = createHookRegistry();

/**
 * Registers a hook callback for the given event name.
 * Creates the internal Set if it doesn't exist yet.
 * @param registry - Registry to register in, or "global" for global registry
 * @param name - Lifecycle hook name
 * @param cb - Callback function to register
 */
export function hookOn(
  registry: LifecycleRegistry | "global",
  name: LifecycleHook,
  cb: HookCallback,
): void {
  if (registry === "global") registry = globalHookRegistry;
  if (!registry.has(name)) registry.set(name, new Set());
  registry.get(name)!.add(cb);
}

/**
 * Unregisters a specific hook callback for the given event name.
 * @param registry - Registry to unregister from, or "global" for global registry
 * @param name - Lifecycle hook name
 * @param cb - Callback function to unregister
 */
export function hookOff(
  registry: LifecycleRegistry | "global",
  name: LifecycleHook,
  cb: HookCallback,
): void {
  if (registry === "global") registry = globalHookRegistry;
  registry.get(name)?.delete(cb);
}

/**
 * Emits an event to all registered callbacks for the given name.
 * Each callback is wrapped in try-catch to prevent one failure from stopping others.
 * @param registry - Registry to emit from, or "global" for global registry
 * @param name - Lifecycle hook name
 * @param context - Optional state context to pass to callbacks
 */
export async function hookEmit(
  registry: LifecycleRegistry | "global",
  name: LifecycleHook,
  context?: State,
): Promise<void> {
  if (registry === "global") registry = globalHookRegistry;
  const listeners = Array.from(registry.get(name) ?? []);
  for (const fn of listeners) {
    try {
      await fn(context);
    } catch (error) {
      logger.errorWithContext(
        `Hook "${name}" callback failed`,
        { hook: name },
        error,
      );
    }
  }
}

/**
 * Clears all registered hooks in the registry.
 * @param registry - Registry to clear, or "global" for global registry
 */
export function hookClear(registry: LifecycleRegistry | "global"): void {
  if (registry === "global") registry = globalHookRegistry;
  registry.clear();
}
