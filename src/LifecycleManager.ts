// 📁 src/LifecycleManager.ts

import { GlobalHooks } from './utils/GlobalHooks';
import { HookRegistry } from './utils/HookRegistry';

export class LifecycleManager {
  private instanceHooks = new HookRegistry<Data>();
  private instanceContext!: Data;

  constructor() {}

  public setupLifecycleHooks(module: Module): void {
    this.instanceContext = module.data;
    for (const hook of [
      'created',
      'beforeMount',
      'mounted',
      'beforeUpdate',
      'updated',
      'beforeDestroy',
      'destroyed',
      'processed',
    ] as LifecycleHook[]) {
      if (typeof module[hook] === 'function') {
        this.instanceHooks.register(hook, module[hook]!.bind(module.data));
      }
    }
  }

  public async callHook(hook: LifecycleHook): Promise<void> {
    // global hooks
    await GlobalHooks.dispatch(hook, this.instanceContext);

    // instance hooks
    await this.instanceHooks.dispatch(hook);
  }
}
