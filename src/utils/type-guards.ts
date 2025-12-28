import type {
  ComponentInstance,
  ComponentSource,
  HTMLElementWithInstance,
  IModule,
  IPlugin,
} from "../types";

/**
 * Checks if the given object conforms to the ComponentSource structure.
 *
 * @param ext - The object to test
 * @returns True if the object has template, script, and style strings
 */
export function isComponentSource(ext: any): ext is ComponentSource {
  return (
    typeof ext?.template === "string" &&
    typeof ext?.script === "string" &&
    typeof ext?.style === "string"
  );
}

/**
 * Determines whether the given object is a valid Plugin.
 *
 * @param ext - The object to test
 * @returns True if the object has a `setup` function and no `attach` method
 */
export function isPlugin(ext: any): ext is IPlugin {
  return typeof ext?.setup === "function" && ext?.attach === undefined;
}

/**
 * Determines whether the given object is a valid Module.
 *
 * @param ext - The object to test
 * @returns True if the object has an `attach` function and no `setup` method
 */
export function isModule(ext: any): ext is IModule {
  return typeof ext?.attach === "function" && ext?.setup === undefined;
}

/**
 * Checks whether a DOM element has the `instance` slot (may be undefined).
 *
 * @param el - The value to check
 * @returns True if el is an HTMLElement and carries an `instance` property
 */
export function isHTMLElementWithInstance(el: unknown): el is HTMLElementWithInstance {
  return el instanceof HTMLElement && "instance" in el;
}

/**
 * Checks whether a DOM element has a *set* component instance.
 *
 * @param el - The value to check
 * @returns True if el is HTMLElementWithInstance and instance is defined
 */
export function hasComponentInstance(
  el: unknown,
): el is HTMLElementWithInstance & { instance: ComponentInstance } {
  return (
    el instanceof HTMLElement &&
    "instance" in el &&
    (el as HTMLElementWithInstance).instance !== undefined
  );
}

/**
 * Validates that a RegExp match array represents a valid loop definition.
 *
 * Used for syntax like `item in collection`.
 *
 * @param match - The result of RegExp.match()
 * @returns True if the match has exactly three elements and valid capture groups
 */
export function isValidLoopMatch(
  match: RegExpMatchArray | null,
): match is [string, string, string] {
  return !!match && match.length === 3 && Boolean(match[1]) && Boolean(match[2]);
}
