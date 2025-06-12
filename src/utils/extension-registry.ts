// src/utils/extension-registry.ts

import type { IModule, IPlugin } from '../types';

export default {
  modules: {} as Record<string, IModule>,
  plugins: {} as Record<string, IPlugin>,
};
