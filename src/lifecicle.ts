// src/lifecycle.ts

import { GlobalHooks } from './utils/global-hooks';
import { createHookRegistry } from './utils/hook-registry';

import type { Data, LifecycleHook, ComponentController, Lifecycle } from './types';

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

export function createLifecycle(componentController: ComponentController): Lifecycle<Data> {
  const { data } = componentController;
  const hooks = createHookRegistry<Data>();

  for (const hook of lifecycleHooks) {
    const fn = componentController[hook];
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
