// src/utils/extension-registry.ts

import type { IModule, IPlugin } from '../types';

export const ExtensionRegistry = {
  modules: {} as Record<string, IModule>,
  plugins: {} as Record<string, IPlugin>,
};
