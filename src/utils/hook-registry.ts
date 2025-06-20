// src/utils/hook-registry.ts

import type { Data, HookCallback, LifecycleHook, LifecycleRegistry } from '../types';

export function createHookRegistry(): LifecycleRegistry {
  return new Map();
}

/**
 * Registers a hook callback for the given event name.
 * Creates the internal Set if it doesn't exist yet.
 */
export function hookOn(registry: LifecycleRegistry, name: LifecycleHook, cb: HookCallback): void {
  if (!registry.has(name)) registry.set(name, new Set());
  registry.get(name)!.add(cb);
}

/**
 * Unregisters a specific hook callback for the given event name.
 */
export function hookOff(registry: LifecycleRegistry, name: LifecycleHook, cb: HookCallback): void {
  registry.get(name)?.delete(cb);
}

/**
 * Emits an event to all registered callbacks for the given name.
 */
export async function hookEmit(
  registry: LifecycleRegistry,
  name: LifecycleHook,
  context: Data = {},
): Promise<void> {
  const listeners = Array.from(registry.get(name) ?? []);
  for (const fn of listeners) {
    await fn(context);
  }
}

/**
 * Clears all registered hooks in the registry.
 */
export function hookClear(registry: LifecycleRegistry): void {
  registry.clear();
}
