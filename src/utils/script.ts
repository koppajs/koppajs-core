import type {
  CompiledScript,
  ComponentContext,
  ComponentController,
} from "../types";

export function compileCode(strg: string): CompiledScript {
  const sanitizedCode = strg.replace(/\$-\{/g, "${");

  const functionBody = `
    const { $refs, $parent, $emit, $take, $handleEventFromChild, ...rest } = context;

    // Expose all $*-prefixed context entries (e.g. $router, $store) as local variables
    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith('$')) {
        // NOTE: this runs inside a dynamically generated function anyway
        // so using eval here does not make the environment less safe than it already is.
        eval('var ' + key + ' = value');
      }
    }

    return (${sanitizedCode});
  `;

  try {
    const rawFn = new Function("context", functionBody);

    const compiled = ((context: ComponentContext) => rawFn(context)) satisfies (
      context: ComponentContext,
    ) => ComponentController;

    return compiled;
  } catch (error) {
    console.error(
      "❌ Fehler beim Kompilieren von dynamischem Code:\n",
      functionBody,
      "\n→",
      error,
    );
    throw error;
  }
}
