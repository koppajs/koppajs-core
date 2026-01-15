import { getValueByPath, isSimplePathExpression } from "./helper";
import { logger } from "./logger";

/**
 * Converts a kebab-case string to camelCase.
 * @param s - The kebab-case string to convert
 * @returns The converted camelCase string
 */
export function kebabToCamel(s: string): string {
  return s.replace(/-./g, (x) => x[1]!.toUpperCase());
}

// Hard block: forbid common dangerous identifiers / capabilities.
// (This is a heuristic, not a formal proof.)
const FORBIDDEN_KEYWORDS_REGEX =
  /(?:\bwindow\b|\bdocument\b|\bglobalThis\b|\bFunction\b|\beval\b|\bsetTimeout\b|\bsetInterval\b|\bfetch\b|\bXMLHttpRequest\b|\bimport\b|\brequire\b|\bthis\b)/;

/**
 * Evaluates a JavaScript expression in a controlled, restricted scope.
 * Blocks access to dangerous globals (window, document, eval, etc.).
 * Treats simple property paths as "safe" and resolves them via getValueByPath.
 * Evaluates complex expressions using Function, but only with variables from state.
 * Functions are called with state as this context.
 * Note: This is not a full sandbox. It's "restricted and pragmatic".
 * @param expression - Expression string to evaluate
 * @param state - State object to use as context
 * @returns Evaluated result or undefined on error/forbidden keywords
 */
export function evaluateExpression(
  expression: string,
  state: Record<string, any> = {},
): any {
  const exp = (expression ?? "").trim();
  if (!exp) return undefined;

  try {
    if (FORBIDDEN_KEYWORDS_REGEX.test(exp)) {
      return undefined;
    }

    // Simple paths: resolve safely (supports brackets via isSimplePathExpression)
    if (isSimplePathExpression(exp)) {
      const value = getValueByPath(state, exp);
      if (typeof value === "function") return value.call(state);
      return value;
    }

    // Complex expression:
    // Only expose top-level keys from state as function parameters.
    // Everything else is not directly reachable unless referenced through those vars.
    const allowedVars = Object.keys(state);

    // Use strict mode; expression is evaluated as a return value.
    const functionBody = `"use strict"; return (${exp});`;

    const evalFunction = new Function(...allowedVars, functionBody);

    return evalFunction(...allowedVars.map((key) => state[key]));
  } catch (error) {
    logger.debug(`Expression evaluation failed: ${exp}`, error);
    return undefined;
  }
}
