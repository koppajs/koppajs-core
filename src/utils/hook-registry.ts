// src/utils/hook-registry.ts

import type { HookCallback, HookRegistry } from '../types';

export function createHookRegistry<T = any>(): HookRegistry<T> {
  const registry = new Map<string, Set<HookCallback<T>>>();

  return {
    on(name, callback) {
      if (!registry.has(name)) {
        registry.set(name, new Set());
      }
      registry.get(name)!.add(callback);
    },

    off(name, callback) {
      registry.get(name)?.delete(callback);
    },

    async emit(name, context) {
      const listeners = Array.from(registry.get(name) ?? []);
      for (const fn of listeners) {
        await fn(context);
      }
    },

    clear() {
      registry.clear();
    },
  };
}
