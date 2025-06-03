import ExtensionRegistry from '../ExtensionRegistry';
import { Context, ComponentController } from '../types';

const modules = ExtensionRegistry.modules;

export function compileCode(strg: string): (context: Context) => ComponentController {
  const sanitizedCode = strg.replace(/\$-\{/g, '${');

  const functionBody = `
    const { $refs, $parent, $emit, $take } = context;
    const { ${Object.keys(modules).join(', ')} } = modules;
    return (${sanitizedCode});
  `;

  try {
    const compiled = new Function('context', 'modules', functionBody) as (
      context: Context,
    ) => ComponentController;
    return compiled;
  } catch (error) {
    console.error('❌ Fehler beim Kompilieren von dynamischem Code:\n', functionBody, '\n→', error);
    throw error;
  }
}
