// src/utils/helper.ts

import type { Data, Methods } from '../types';

/**
 * Checks whether a given function is an arrow function.
 *
 * @param func - The function to check
 * @returns True if the function is an arrow function, otherwise false
 */
export function isArrowFunction(func: Function): boolean {
  return typeof func === 'function' && !func.hasOwnProperty('prototype');
}

/**
 * Binds all methods from the `methods` object to the provided `data` context.
 *
 * @param data - The reactive data object (usually `this`)
 * @param methods - A map of method names and functions
 */
export function bindMethods(data: Data, methods: Methods): void {
  for (const method in methods) {
    if (methods[method]) {
      data[method] = methods[method].bind(data);
    }
  }
}

/**
 * Checks if a string contains basic HTML tags.
 *
 * @param input - The input string to check
 * @returns True if the string contains HTML-like syntax, otherwise false
 */
export function containsHTML(input: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(input);
}

/**
 * Safely retrieves a value from a nested object using a string path.
 *
 * @param obj - The object to traverse
 * @param path - A dot/bracket-notated path (e.g. "foo.bar[0].baz")
 * @returns The value at the given path or undefined if not found
 */
export function getValueByPath(obj: any, path: string): any {
  if (!obj || typeof path !== 'string') return undefined;

  const pathArray = path
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  try {
    return pathArray.reduce((acc, key) => acc && acc[key], obj);
  } catch {
    return undefined;
  }
}

/**
 * Attempts to resolve a type constructor or string into a normalized lowercase type name.
 *
 * Used for comparing prop types during runtime validation.
 *
 * @param input - A string type name or a constructor function
 * @returns A lowercase string type (e.g. "string", "array") or "unknown"
 */
export function getExpectedPropTypeName(input: unknown): string {
  if (typeof input === 'string') return input.toLowerCase();
  if (typeof input === 'function' && typeof input.name === 'string') {
    return input.name.toLowerCase();
  }
  return 'unknown';
}
