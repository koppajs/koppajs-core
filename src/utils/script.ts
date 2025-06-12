// src/utils/script.ts

import ExtensionRegistry from './extension-registry';

import type { CompiledScript, ComponentContext, ComponentController } from '../types';

const modules = ExtensionRegistry.modules;

export function compileCode(strg: string): CompiledScript {
  const sanitizedCode = strg.replace(/\$-\{/g, '${');

  const functionBody = `
    const { $refs, $parent, $emit, $take, $handleEventFromChild } = context;
    const { ${Object.keys(modules).join(', ')} } = modules;
    return (${sanitizedCode});
  `;

  try {
    const compiled = new Function('context', 'modules', functionBody) as (
      context: ComponentContext,
    ) => ComponentController;
    return compiled;
  } catch (error) {
    console.error('❌ Fehler beim Kompilieren von dynamischem Code:\n', functionBody, '\n→', error);
    throw error;
  }
}
