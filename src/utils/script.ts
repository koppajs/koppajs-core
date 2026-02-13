import type {
  CompiledScript,
  ComponentContext,
  ComponentController,
} from "../types";
import { logger } from "./logger";

/**
 * Resolved dependencies object passed to the compiled script.
 * Keys are the local identifiers, values are the resolved import values.
 */
export type ResolvedDeps = Record<string, unknown>;

/**
 * Generates var declarations for injected dependencies.
 * Creates `var <IDENT> = __deps.<IDENT>;` for each dependency.
 *
 * @param depKeys - Array of dependency identifier names
 * @returns Injection header string to prepend to function body
 */
function generateDepsInjectionHeader(depKeys: string[]): string {
  if (depKeys.length === 0) return "";

  // Generate var declarations for each dependency
  // No collision handling - redeclarations will throw SyntaxError naturally
  return depKeys.map((key) => `var ${key} = __deps.${key};`).join("\n") + "\n";
}

/**
 * Compiles component script string into an executable function.
 * Exposes context variables ($refs, $parent, etc.) and dynamic module properties.
 * Optionally injects resolved dependencies as local variables.
 *
 * @param strg - Component script string
 * @param resolvedDeps - Optional resolved dependencies to inject as local variables
 * @returns Compiled script function
 * @throws Error if compilation fails
 * @throws SyntaxError if user script redeclares an injected dependency name
 */
export function compileCode(
  strg: string,
  resolvedDeps?: ResolvedDeps,
): CompiledScript {
  const sanitizedCode = strg.replace(/\$-\{/g, "${");

  // Generate injection header for dependencies
  const depKeys = resolvedDeps ? Object.keys(resolvedDeps) : [];
  const depsInjection = generateDepsInjectionHeader(depKeys);

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

    // Inject resolved dependencies as local variables
    ${depsInjection}

    return (${sanitizedCode});
  `;

  try {
    // Include __deps parameter if we have dependencies
    const rawFn = resolvedDeps
      ? new Function("context", "__deps", functionBody)
      : new Function("context", functionBody);

    const compiled = ((context: ComponentContext) =>
      resolvedDeps ? rawFn(context, resolvedDeps) : rawFn(context)) satisfies (
      context: ComponentContext,
    ) => ComponentController;

    return compiled;
  } catch (error) {
    logger.errorWithContext(
      "Failed to compile dynamic code",
      { functionBody },
      error,
    );
    throw error;
  }
}
