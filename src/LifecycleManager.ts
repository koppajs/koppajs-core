// 📁 `src/LifecycleManager.ts`

/**
 * Manages lifecycle hooks for application modules and invokes them at appropriate times.
 */
export class LifecycleManager {
  /**
   * Stores registered lifecycle hooks mapped by their hook name.
   */
  private hooks: Partial<Record<LifecycleHook, Function>> = {};

  /**
   * Initializes a new instance of the LifecycleManager.
   */
  constructor() {}

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
        this.hooks[hook] = module[hook]!.bind(data);
      }
    }
  }

  /**
   * Calls a specified lifecycle hook if it has been registered.
   *
   * @param {LifecycleHook} hook - The name of the lifecycle hook to invoke.
   */
  public callHook(hook: LifecycleHook): void {
    this.hooks[hook]?.();
  }
}
