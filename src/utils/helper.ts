import {
  BOUND,
  type AnyFn,
  type BoundFn,
  type State,
  type Methods,
} from "../types";
import { logger } from "./logger";

/**
 * Binds a function to a context once, preventing multiple bindings.
 * Uses a symbol to mark bound functions.
 * @param fn - Function to bind
 * @param userContext - Context to bind function to
 * @returns Bound function (or original if already bound or not a function)
 */
export function bindOnce(
  fn: AnyFn,
  userContext: State,
): AnyFn {
  if (typeof fn !== "function") return fn;

  const maybe = fn as BoundFn;
  if (maybe[BOUND]) return fn;

  const bound = fn.bind(userContext) as BoundFn;
  bound[BOUND] = true;
  return bound;
}

/**
 * Binds all methods from the `methods` object to the provided `userContext`.
 * @param methods - A map of method names and functions
 * @param userContext - The user context object (this context for user functions)
 */
export function bindMethods(
  methods: Methods,
  userContext: State,
): void {
  for (const name in methods) {
    const fn = methods[name];
    if (
      Object.prototype.hasOwnProperty.call(methods, name) &&
      typeof fn === "function"
    ) {
      try {
        methods[name] = bindOnce(fn, userContext);
      } catch (error) {
        logger.errorWithContext(
          `Failed to bind method "${name}"`,
          { methodName: name },
          error,
        );
      }
    }
  }
}

/**
 * Checks if a string contains basic HTML tags.
 * @param input - The input string to check
 * @returns True if the string contains HTML-like syntax, otherwise false
 */
export function containsHTML(input: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(input);
}

/**
 * Safely retrieves a value from a nested object using a string path.
 * Supports dot/bracket notation: "foo.bar[0].baz"
 * Does NOT throw (returns undefined on invalid access).
 * @param obj - Object to read from
 * @param path - Property path (dot/bracket notation)
 * @returns Value at path or undefined if not found
 */
export function getValueByPath(obj: any, path: string): any {
  if (obj == null || typeof path !== "string") return undefined;

  const tokens = path
    .trim()
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  try {
    return tokens.reduce((acc, key) => {
      if (acc == null) return undefined;
      return (acc as any)[key];
    }, obj);
  } catch {
    return undefined;
  }
}

/**
 * Resolves a type constructor or string into a normalized lowercase type name.
 * Used for comparing prop types during runtime validation.
 * @param input - A string type name or a constructor function
 * @returns A lowercase string type (e.g. "string", "array") or "unknown"
 */
export function getExpectedPropTypeName(input: unknown): string {
  if (typeof input === "string") return input.toLowerCase();
  if (typeof input === "function" && typeof input.name === "string") {
    return input.name.toLowerCase();
  }
  return "unknown";
}

/**
 * Checks whether a string is a simple property path expression.
 * Supports: foo.bar.baz, foo[0].bar, foo.bar[0].baz
 * @param expression - Expression string to check
 * @returns True if expression is a simple path
 */
export function isSimplePathExpression(expression: string): boolean {
  const exp = expression.trim();

  // allow dot + bracket numeric/index or identifier in brackets
  // examples: a.b, a[0], a['x'] is NOT supported here (intentionally)
  return /^[a-zA-Z_$][0-9a-zA-Z_$]*(?:\[(?:\d+|\w+)\]|\.[a-zA-Z_$][0-9a-zA-Z_$]*)*$/.test(
    exp,
  );
}

/**
 * Sets a value on a nested object using a dot/bracket-notated path.
 * Does NOT create missing objects/arrays. Children may not "invent" structure in parent.
 * Throws descriptive errors when the path is invalid or non-writable.
 * Supports bracket tokens like [0] or [key] (key treated as string unless numeric).
 * @param obj - Object to write to
 * @param path - Property path (dot/bracket notation)
 * @param value - Value to set
 * @throws Error if path is invalid or property is read-only
 */
export function setValueByPath(obj: any, path: string, value: any): void {
  if (obj == null || (typeof obj !== "object" && typeof obj !== "function")) {
    throw new Error("❌ setValueByPath: target must be an object.");
  }
  if (typeof path !== "string" || !path.trim()) {
    throw new Error("❌ setValueByPath: path must be a non-empty string.");
  }

  const tokens = path
    .trim()
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new Error(`❌ setValueByPath: invalid path "${path}".`);
  }

  const hasOwn = (o: any, k: string) =>
    Object.prototype.hasOwnProperty.call(o, k);

  const last = tokens.pop()!;
  let target: any = obj;

  for (const key of tokens) {
    if (
      target == null ||
      (typeof target !== "object" && typeof target !== "function")
    ) {
      throw new Error(
        `❌ setValueByPath: invalid path "${path}". Segment "${key}" is not an object.`,
      );
    }

    // IMPORTANT: no prototype traversal, no implicit creation
    if (!hasOwn(target, key)) {
      throw new Error(
        `❌ setValueByPath: invalid path "${path}". Missing segment "${key}".`,
      );
    }

    const next = target[key];

    if (
      next == null ||
      (typeof next !== "object" && typeof next !== "function")
    ) {
      throw new Error(
        `❌ setValueByPath: invalid path "${path}". Segment "${key}" is not an object.`,
      );
    }

    target = next;
  }

  if (
    target == null ||
    (typeof target !== "object" && typeof target !== "function")
  ) {
    throw new Error(
      `❌ setValueByPath: invalid path "${path}". Final target is not an object.`,
    );
  }

  // IMPORTANT: final key must be an OWN property, otherwise assignment would create it
  if (!hasOwn(target, last)) {
    throw new Error(
      `❌ setValueByPath: invalid path "${path}". Final key "${last}" does not exist.`,
    );
  }

  const desc = Object.getOwnPropertyDescriptor(target, last);

  // If descriptor exists and is not writable and has no setter -> reject
  if (desc && desc.writable === false && !desc.set) {
    throw new Error(
      `❌ setValueByPath: cannot write "${path}". Property "${last}" is read-only.`,
    );
  }

  target[last] = value;
}
