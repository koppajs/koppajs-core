import { getValueByPath, isSimplePathExpression } from './helper'

/**
 * Converts a kebab-case string to camelCase.
 *
 * @param s - The kebab-case string to convert
 * @returns The converted camelCase string
 */
export function kebabToCamel(s: string): string {
  return s.replace(/-./g, (x) => x[1]!.toUpperCase());
}

/**
 * Evaluates a JavaScript expression in a controlled, restricted scope.
 *
 * - Blocks access to dangerous globals (`window`, `document`, `eval`, etc.)
 * - Treats simple property paths as "safe" and resolves them via getValueByPath
 *   (supports dot + bracket notation like arr[0].x)
 * - Evaluates complex expressions using Function, but only with variables
 *   taken from `data` as parameters.
 *
 * Note:
 * This is *not* a full sandbox. It's "restricted and pragmatic".
 */
export function evaluateExpression(
  expression: string,
  data: Record<string, any> = {},
): any {
  try {
    const exp = (expression ?? '').trim()
    if (!exp) return undefined

    // Hard block: forbid common dangerous identifiers / capabilities.
    // (This is a heuristic, not a formal proof.)
    const forbiddenKeywords =
      /(?:\bwindow\b|\bdocument\b|\bglobalThis\b|\bFunction\b|\beval\b|\bsetTimeout\b|\bsetInterval\b|\bfetch\b|\bXMLHttpRequest\b|\bimport\b|\brequire\b|\bthis\b)/

    if (forbiddenKeywords.test(exp)) {
      return false
    }

    // Simple paths: resolve safely (supports brackets via isSimplePathExpression)
    if (isSimplePathExpression(exp)) {
      const value = getValueByPath(data, exp)
      if (typeof value === 'function') return value.call(data)
      return value
    }

    // Complex expression:
    // Only expose top-level keys from data as function parameters.
    // Everything else is not directly reachable unless referenced through those vars.
    const allowedVars = Object.keys(data)

    // Use strict mode; expression is evaluated as a return value.
    const functionBody = `"use strict"; return (${exp});`

    const evalFunction = new Function(...allowedVars, functionBody)

    return evalFunction(...allowedVars.map((key) => data[key]))
  } catch {
    return false
  }
}
