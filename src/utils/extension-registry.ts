import type { IModule, IPlugin } from "../types";

/**
 * Global registry for extensions (plugins and modules).
 * Plugins provide setup methods for components.
 * Modules provide attach methods for component elements.
 */
export const ExtensionRegistry: {
  modules: Record<string, IModule>;
  plugins: Record<string, IPlugin>;
} = {
  modules: {},
  plugins: {},
};
