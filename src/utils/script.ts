// 📁 `src/utils/script.ts`

/**
 * Converts a string representation of code into an executable function within a given context and module scope.
 *
 * @param {string} strg - The string containing the code to be executed.
 * @param {Context} context - An object representing the execution context, providing scoped variables.
 * @param {Record<string, Function | Object>} modules - A record of additional modules (functions or objects) available within the execution scope.
 *
 * @returns {Promise<Module>} - A promise resolving to the executed module output.
 */
export async function stringToCode(
  strg: string,
  context: Context,
  modules: Record<string, Function | Object>,
): Promise<Module> {
  /**
   * Dynamically creates a function from the provided string, injecting the given context and modules.
   *
   * - `context` is destructured to provide local scope variables.
   * - `modules` is destructured to allow access to external dependencies.
   * - The provided string is processed to replace specific syntax (`$-{}` -> `${}`) to ensure valid execution.
   */
  const func = new Function(
    '_____, ______', // Placeholder parameter names to receive context and module objects.
    `const { ${Object.keys(context).join(', ')} } = _____;
        const { ${Object.keys(modules).join(', ')} } = ______;
        return ${strg.replace(/\$-\{/g, '\${')};`, // Replace placeholders in the code string for correct interpolation.
  );

  // Execute the dynamically created function with the provided context and modules, returning the result.
  return func(context, modules);
}
