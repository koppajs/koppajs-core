// src/utils/hook-registry.ts

export type HookCallback<T> = (context: T) => void | Promise<void>;

export interface HookRegistry<T> {
  on: (name: string, callback: HookCallback<T>) => void;
  off: (name: string, callback: HookCallback<T>) => void;
  emit: (name: string, context: T) => Promise<void>;
  clear: () => void;
}

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
