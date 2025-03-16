// 📁 `src/LifecycleManager.ts`
/// <reference path="../types.d.ts" />

/**
 * Manages lifecycle hooks for application modules and invokes them at appropriate times.
 */
export class LifecycleManager {
  /**
   * Stores registered lifecycle hooks mapped by their hook name.
   */
  private hooks: Partial<Record<LifecycleHook, [Function, Data]>> = {};

  private core: Record<string, Function>; // The core context

  /**
   * Initializes a new instance of the LifecycleManager.
   */
  constructor(core: Record<string, Function>) {
    this.core = core;
  }

  /**
   * Sets up lifecycle hooks for a given module by binding them to the provided data model.
   *
   * @template T - The type of the model data.
   * @param {Data} data - The reactive data model to bind hooks to.
   * @param {Module} module - The module containing lifecycle hooks.
   */
  public setupLifecycleHooks(data: Data, module: Module): void {
    for (const hook of [
      'created',
      'beforeMount',
      'mounted',
      'updated',
      'beforeDestroy',
      'destroyed',
    ] as LifecycleHook[]) {
      if (typeof module[hook] === 'function') {
        // Bind the hook function to the provided data model and store it
        this.hooks[hook] = [module[hook]!.bind(data), data];
      }
    }
  }

  /**
   * Calls a specified lifecycle hook if it has been registered.
   *
   * @param {LifecycleHook} hook - The name of the lifecycle hook to invoke.
   */
  public callHook(hook: LifecycleHook): void {
    const instanceHook = this.hooks[hook];
    if (instanceHook) {
      const [hookFunction, hookContext] = instanceHook;
      // Ensure callPluginHook exists and is a function before invoking it
      if (typeof this.core.callPluginHook === 'function') {
        if (hookContext) {
          // If a context is provided, call the function with the context using .call
          this.core.callPluginHook.call(hookContext, hook);
        } else {
          // If no context is provided, call the function normally
          this.core.callPluginHook(hook);
        }
      }
      // Execute the actual hook function
      hookFunction();
    }
  }
}
