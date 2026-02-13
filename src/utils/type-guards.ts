import type {
  ComponentInstance,
  ComponentSource,
  HTMLElementWithInstance,
  IModule,
  IPlugin,
} from "../types";

/* -------------------------------------------------------------------------- */
/*  ComponentSource Contract Guard                                            */
/* -------------------------------------------------------------------------- */

/**
 * Runtime type guard for the ComponentSource contract.
 *
 * Validates that an object conforms to the ComponentSource interface by
 * checking for REQUIRED fields only. Optional fields are not validated
 * (absence is acceptable), and unknown extra fields are ignored.
 *
 * ## Contract Validation Rules:
 *
 * **REQUIRED** (must be present and be strings):
 * - `template` - HTML template string
 * - `script`   - JavaScript controller code string
 * - `style`    - CSS style string
 *
 * **OPTIONAL** (not validated, absence is acceptable):
 * - `scriptMap`, `type`, `deps`, `structAttr`
 *
 * **IGNORED** (extra fields are allowed and not validated):
 * - Any additional properties are permitted for forward compatibility
 *
 * @param ext - The object to test
 * @returns True if the object satisfies the ComponentSource contract
 *
 * @example
 * ```ts
 * // Valid minimal ComponentSource
 * isComponentSource({ template: '', script: '', style: '' }) // true
 *
 * // Valid with optional fields
 * isComponentSource({ template: '', script: '', style: '', deps: null }) // true
 *
 * // Valid with extra fields (ignored)
 * isComponentSource({ template: '', script: '', style: '', debug: true }) // true
 *
 * // Invalid - missing required field
 * isComponentSource({ template: '', script: '' }) // false
 *
 * // Invalid - wrong type
 * isComponentSource({ template: 123, script: '', style: '' }) // false
 * ```
 */
export function isComponentSource(ext: unknown): ext is ComponentSource {
  if (ext == null || typeof ext !== "object") return false;
  const obj = ext as Record<string, unknown>;

  // Validate REQUIRED fields only (must be strings)
  // Optional fields are not validated - absence is acceptable
  // Extra fields are ignored - forward compatibility
  return (
    typeof obj.template === "string" &&
    typeof obj.script === "string" &&
    typeof obj.style === "string"
  );
}

/**
 * Determines whether the given object is a valid Plugin.
 *
 * @param ext - The object to test
 * @returns True if the object has a `setup` function and no `attach` method
 */
export function isPlugin(ext: unknown): ext is IPlugin {
  if (ext == null || typeof ext !== "object") return false;
  const obj = ext as Record<string, unknown>;
  return typeof obj.setup === "function" && obj.attach === undefined;
}

/**
 * Determines whether the given object is a valid Module.
 *
 * @param ext - The object to test
 * @returns True if the object has an `attach` function and no `setup` method
 */
export function isModule(ext: unknown): ext is IModule {
  if (ext == null || typeof ext !== "object") return false;
  const obj = ext as Record<string, unknown>;
  return typeof obj.attach === "function" && obj.setup === undefined;
}

/**
 * Checks whether a DOM element has the `instance` slot (may be undefined).
 *
 * @param el - The value to check
 * @returns True if el is an HTMLElement and carries an `instance` property
 */
export function isHTMLElementWithInstance(
  el: unknown,
): el is HTMLElementWithInstance {
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
  return (
    !!match && match.length === 3 && Boolean(match[1]) && Boolean(match[2])
  );
}
