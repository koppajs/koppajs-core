// 📁 src/utils/GlobalHooks.ts

/**
 * GlobalHooks is a singleton hook registry for registering and dispatching
 * application-wide lifecycle or global events. It allows modules and components
 * to tap into shared hooks (e.g., created, mounted, destroyed) across the app.
 *
 * Internally, it leverages HookRegistry, supporting asynchronous handlers,
 * automatic context binding, and ordered dispatch of registered listeners.
 *
 * @example
 * // Register a global listener for the "mounted" hook
 * GlobalHooks.register('mounted', (ctx) => {
 *   console.log('A component has been mounted', ctx);
 * });
 *
 * // Later, dispatch all "mounted" listeners with a given context
 * await GlobalHooks.dispatch('mounted', { componentName: 'MyComponent' });
 */
import { HookRegistry } from './HookRegistry';

export const GlobalHooks = new HookRegistry<any>();
