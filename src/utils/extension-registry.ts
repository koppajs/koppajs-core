// src/utils/extension-registry.ts

import type { IModule, IPlugin } from '../types';

export const ExtensionRegistry: {
  modules: Record<string, IModule>;
  plugins: Record<string, IPlugin>;
} = {
  modules: {},
  plugins: {},
};
