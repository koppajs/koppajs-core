import { ExtensionRegistry } from './extension-registry';
import type { CompiledScript, ComponentContext, ComponentController } from '../types';

export function compileCode(strg: string): CompiledScript {
  const sanitizedCode = strg.replace(/\$-\{/g, '${');
  const modules = ExtensionRegistry.modules;

  const moduleKeys = Object.keys(modules).filter((k) => k.startsWith('$'));
  const destructureLine =
    moduleKeys.length > 0 ? `const { ${moduleKeys.join(', ')} } = modules;` : '';

  const functionBody = `
    const { $refs, $parent, $emit, $take, $handleEventFromChild } = context;
    ${destructureLine}
    return (${sanitizedCode});
  `;

  try {
    const rawFn = new Function('context', 'modules', functionBody);

    const compiled = ((context: ComponentContext) => rawFn(context, modules)) satisfies (
      context: ComponentContext,
    ) => ComponentController;

    return compiled;
  } catch (error) {
    console.error('❌ Fehler beim Kompilieren von dynamischem Code:\n', functionBody, '\n→', error);
    throw error;
  }
}
