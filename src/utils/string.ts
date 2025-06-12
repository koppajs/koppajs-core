// src/utils/string.ts

import { getValueByPath } from './helper';

/**
 * Converts a kebab-case string to camelCase.
 * @param {string} s - The kebab-case string to convert.
 * @returns {string} - The converted camelCase string.
 */
export function kebabToCamel(s: string): string {
  return s.replace(/-./g, (x) => x[1]!.toUpperCase());
}

/**
 * Evaluates a JavaScript expression in a controlled and restricted manner.
 *
 * - The function prevents access to potentially dangerous global objects like `window`, `document`, etc.
 * - If the expression is a simple variable path (e.g., `someVar.prop`), it is safely resolved from the provided data object.
 * - Otherwise, the expression is evaluated inside a restricted function scope with only the provided `data` as context.
 *
 * @param {string} expression - The JavaScript expression to evaluate.
 * @param {Record<string, any>} [data={}] - An optional data object containing variables accessible in the expression.
 * @returns {any} - The evaluated result or `false` if evaluation is not allowed or an error occurs.
 */
export function evaluateExpression(expression: string, data: Record<string, any> = {}): any {
  try {
    // Define a regular expression to detect forbidden keywords that could allow unsafe execution.
    const forbiddenKeywords =
      /(?:window|document|globalThis|Function|eval|setTimeout|setInterval|fetch|XMLHttpRequest|import|require|this)/;

    // If the expression contains any forbidden keywords, return false to prevent execution.
    if (forbiddenKeywords.test(expression)) {
      return false;
    }

    // If the expression follows a simple property path pattern (e.g., `object.prop.subProp`), resolve it safely.
    if (/^[a-zA-Z_$][0-9a-zA-Z_$]*(\.[a-zA-Z_$][0-9a-zA-Z_$]*)*$/.test(expression)) {
      const value = getValueByPath(data, expression);

      // If the resolved value is a function, call it with `data` as its context.
      if (typeof value === 'function') {
        return value.call(data);
      }

      return value;
    }

    // Extract variable names from the provided data object.
    const allowedVars = Object.keys(data);

    // Create a function body that strictly evaluates the expression.
    const functionBody = `"use strict"; return (${expression});`;

    // Construct a new function with the allowed variables as parameters.
    const evalFunction = new Function(...allowedVars, functionBody);

    // Execute the function with values from the data object and return the result.
    return evalFunction(...allowedVars.map((key) => data[key]));
  } catch (error) {
    // Return false if an error occurs during evaluation.
    return false;
  }
}
