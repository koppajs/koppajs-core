// 📁 src/utils/HookRegistry.ts

/**
 * A hook listener function, which may optionally accept
 * a context of type `T` and return a value or a Promise.
 */
export type HookCallback<T> = (context?: T) => any | Promise<any>;

/**
 * HookRegistry provides a simple pub/sub mechanism for named hooks.
 *
 * You can register listeners under specific hook names, and later
 * dispatch those hooks, causing all registered listeners to run
 * in sequence. Async listeners (returning Promises) are awaited.
 *
 * @template T  The type of the optional context passed to listeners.
 */
export class HookRegistry<T = any> {
  // Internal map of hook names to arrays of listener functions.
  private hooks: Partial<Record<string, HookCallback<T>[]>> = {};

  /**
   * Register a listener for the given hook name.
   *
   * @param hookName  The name of the hook to listen for.
   * @param fn        The callback to invoke when the hook is dispatched.
   */
  public register = (hookName: string, callback: HookCallback<T>): void => {
    if (!this.hooks[hookName]) {
      this.hooks[hookName] = [];
    }
    this.hooks[hookName]!.push(callback);
  };

  /**
   * Dispatch all listeners for a given hook name.
   *
   * - If a listener declares at least one parameter (`fn.length > 0`),
   *   it is invoked with `context` as its `this` value.
   * - Otherwise it is invoked with no arguments.
   * - If a listener returns a Promise, dispatch will await its resolution
   *   before proceeding to the next listener.
   *
   * @param name      The name of the hook to dispatch.
   * @param context   Optional context object passed to listeners.
   */
  public dispatch = async (name: string, context?: T): Promise<void> => {
    const fns = this.hooks[name] || [];
    for (const fn of fns) {
      let result: any;
      if (fn.length > 0) {
        // Listener expects a context argument
        result = fn.call(context);
      } else {
        // Listener does not expect arguments
        result = fn();
      }
      // Await if the listener returned a Promise
      if (result && typeof result.then === 'function') {
        await result;
      }
    }
  };
}
