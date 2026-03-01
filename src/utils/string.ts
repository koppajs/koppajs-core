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
 * Cache for compiled expression functions.
 * Key format: "expression|var1,var2,var3" (expression + sorted allowed vars)
 * This avoids recreating Functions on every render.
 */
const expressionCache = new Map<string, (...args: unknown[]) => unknown>();

/**
 * Maximum cache size to prevent memory leaks in long-running apps.
 */
const MAX_CACHE_SIZE = 1000;

/**
 * Cache for sorted state keys per state object.
 * Avoids recomputing Object.keys(state).sort() for every complex expression.
 * Uses WeakMap so entries are GC'd when state objects are collected.
 * Invalidation uses a fingerprint of the actual key names (not just count),
 * so key swaps (delete + add with same count) are detected correctly.
 */
const sortedKeysCache = new WeakMap<
  Record<string, unknown>,
  { keys: string[]; fingerprint: string }
>();

/**
 * Gets sorted keys for a state object, using cache when possible.
 * Invalidates cache when the actual set of key names changes.
 */
function getCachedSortedKeys(state: Record<string, unknown>): string[] {
  const currentKeys = Object.keys(state);
  const fingerprint = currentKeys.join("\0");
  const cached = sortedKeysCache.get(state);
  if (cached && cached.fingerprint === fingerprint) {
    return cached.keys;
  }
  const sorted = currentKeys.sort();
  sortedKeysCache.set(state, { keys: sorted, fingerprint });
  return sorted;
}

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
  state: Record<string, unknown> = {},
): unknown {
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
    const allowedVars = getCachedSortedKeys(state);

    // Build cache key from expression and variable names
    const cacheKey = `${exp}|${allowedVars.join(",")}`;

    // Check cache for compiled function
    let evalFunction = expressionCache.get(cacheKey);

    if (!evalFunction) {
      // Use strict mode; expression is evaluated as a return value.
      const functionBody = `"use strict"; return (${exp});`;
      evalFunction = new Function(...allowedVars, functionBody);

      // Prevent unbounded cache growth
      if (expressionCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry (first inserted)
        const firstKey = expressionCache.keys().next().value;
        if (firstKey) expressionCache.delete(firstKey);
      }

      expressionCache.set(cacheKey, evalFunction);
    }

    return evalFunction(...allowedVars.map((key) => state[key]));
  } catch (error) {
    logger.debug(`Expression evaluation failed: ${exp}`, error);
    return undefined;
  }
}
