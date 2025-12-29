import {
  BOUND,
  type AnyFn,
  type BoundFn,
  type Data,
  type Methods,
} from "../types";

/**
 * Checks whether a given function is an arrow function.
 *
 * @param func - The function to check
 * @returns True if the function is an arrow function, otherwise false
 */
export function isArrowFunction(func: AnyFn): boolean {
  return typeof func === "function" && !Object.hasOwn(func, "prototype");
}

export function bindOnce(fn: AnyFn, bindings: Data): AnyFn {
  if (typeof fn !== "function") return fn;

  // Arrow: bind bringt nichts für `this`
  if (isArrowFunction(fn)) return fn;

  const maybe = fn as BoundFn;
  if (maybe[BOUND]) return fn;

  const bound = fn.bind(bindings) as BoundFn;
  bound[BOUND] = true;
  return bound;
}

/**
 * Binds all methods from the `methods` object to the provided `data` context.
 *
 * @param data - The reactive data object (usually `this`)
 * @param methods - A map of method names and functions
 */
// export function bindMethods(data: Data, methods: Methods): void {
//   for (const method in methods) {
//     if (
//       Object.prototype.hasOwnProperty.call(methods, method) &&
//       methods[method]
//     ) {
//       data[method] = methods[method]!.bind(data);
//     }
//   }
// }

export function bindMethods(methods: Methods, bindings: Data): void {
  for (const name in methods) {
    const fn = methods[name];
    if (
      Object.prototype.hasOwnProperty.call(methods, name) &&
      typeof fn === "function"
    ) {
      // methods[name] = fn.bind(bindings as Data);
      methods[name] = bindOnce(fn, bindings);
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
 * - Supports dot/bracket notation: "foo.bar[0].baz"
 * - Does NOT throw (returns undefined on invalid access)
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
 * Attempts to resolve a type constructor or string into a normalized lowercase type name.
 *
 * Used for comparing prop types during runtime validation.
 *
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
 *
 * Supports:
 * - foo.bar.baz
 * - foo[0].bar
 * - foo.bar[0].baz
 */
export function isSimplePathExpression(expression: string): boolean {
  const exp = expression.trim();

  // allow dot + bracket numeric/index or identifier in brackets
  // examples: a.b, a[0], a['x'] is NOT supported here (intentionally)
  return /^[a-zA-Z_$][0-9a-zA-Z_$]*(?:\[(?:\d+|\w+)\]|\.[a-zA-Z_$][0-9a-zA-Z_$]*)*$/.test(
    exp
  );
}

/**
 * Sets a value on a nested object using a dot/bracket-notated path.
 *
 * - Does NOT create missing objects/arrays. Childs may not "invent" structure in parent.
 * - Throws descriptive errors when the path is invalid or non-writable.
 * - Supports bracket tokens like [0] or [key] (key treated as string unless numeric).
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
        `❌ setValueByPath: invalid path "${path}". Segment "${key}" is not an object.`
      );
    }

    // IMPORTANT: no prototype traversal, no implicit creation
    if (!hasOwn(target, key)) {
      throw new Error(
        `❌ setValueByPath: invalid path "${path}". Missing segment "${key}".`
      );
    }

    const next = target[key];

    if (
      next == null ||
      (typeof next !== "object" && typeof next !== "function")
    ) {
      throw new Error(
        `❌ setValueByPath: invalid path "${path}". Segment "${key}" is not an object.`
      );
    }

    target = next;
  }

  if (
    target == null ||
    (typeof target !== "object" && typeof target !== "function")
  ) {
    throw new Error(
      `❌ setValueByPath: invalid path "${path}". Final target is not an object.`
    );
  }

  // IMPORTANT: final key must be an OWN property, otherwise assignment would create it
  if (!hasOwn(target, last)) {
    throw new Error(
      `❌ setValueByPath: invalid path "${path}". Final key "${last}" does not exist.`
    );
  }

  const desc = Object.getOwnPropertyDescriptor(target, last);

  // If descriptor exists and is not writable and has no setter -> reject
  if (desc && desc.writable === false && !desc.set) {
    throw new Error(
      `❌ setValueByPath: cannot write "${path}". Property "${last}" is read-only.`
    );
  }

  target[last] = value;
}
