// src/lifecycle.ts

import { Data, LifecycleHook, Module } from './types';
import { GlobalHooks } from './utils/global-hooks';
import { createHookRegistry, HookRegistry } from './utils/hook-registry';

const lifecycleHooks: LifecycleHook[] = [
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'processed',
];

export interface Lifecycle<T> {
  on: (name: LifecycleHook, fn: (this: T) => void | Promise<void>) => void;
  off: (name: LifecycleHook, fn: (this: T) => void | Promise<void>) => void;
  clear: () => void;
  emit(hook: LifecycleHook): Promise<void>;
}

export function createLifecycle(module: Module): Lifecycle<Data> {
  const { data } = module;
  const hooks = createHookRegistry<Data>();

  for (const hook of lifecycleHooks) {
    const fn = module[hook];
    if (typeof fn === 'function') {
      hooks.on(hook, fn.bind(data));
    }
  }

  return {
    on: hooks.on,
    off: hooks.off,
    clear: hooks.clear,
    async emit(hook: LifecycleHook) {
      await GlobalHooks.emit(hook, data);
      await hooks.emit(hook, data);
    },
  };
}
