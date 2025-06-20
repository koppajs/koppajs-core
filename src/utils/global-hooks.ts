// src/utils/global-hooks.ts

import { hookOn, hookOff, hookEmit, hookClear, createHookRegistry } from './hook-registry';

import type { Data, HookCallback, LifecycleHook } from '../types';

const globalHookRegistry = createHookRegistry();

export const GlobalHooks = {
  on(name: LifecycleHook, cb: HookCallback) {
    hookOn(globalHookRegistry, name, cb);
  },
  off(name: LifecycleHook, cb: HookCallback) {
    hookOff(globalHookRegistry, name, cb);
  },
  clear() {
    hookClear(globalHookRegistry);
  },
  async emit(name: LifecycleHook, context: Data) {
    await hookEmit(globalHookRegistry, name, context);
  },
} satisfies {
  on: (name: LifecycleHook, cb: HookCallback) => void;
  off: (name: LifecycleHook, cb: HookCallback) => void;
  emit: (name: LifecycleHook, context: Data) => Promise<void>;
  clear: () => void;
};
