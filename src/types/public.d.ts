// TypeScript Definitions for KoppaJS Core
// ----------------------------------------

/**
 * Definition of a single prop for a component.
 * Enables type validation, default values, required checks, and regex validation.
 */
export interface PropsDefinition {
  type?: string; // Expected type as string (e.g., "string", "number", "boolean", ...)
  required?: boolean; // Indicates whether this prop is required
  default?: any; // Default value if the prop is not provided
  regex?: string; // Optional regex for string validation
}

/**
 * A collection of named props for a component.
 */
export type Props = Record<string, PropsDefinition>;

/**
 * Reactive data object of a component. Arbitrary key-value pairs.
 */
export type Data = Record<string, any>;

/**
 * Object of methods defined within a component.
 * These are user-defined functions bound to the reactive context.
 */
export type Methods = Record<string, Function>;

/**
 * References to DOM elements within a component marked with `ref="name"`.
 */
export type Refs = Record<string, HTMLElement>;

/**
 * List of properties to observe for reactivity.
 */
export type WatchList = string[];

/**
 * A single event binding.
 * Consists of an event type (e.g., "click"), target (selector, element, or window), and handler function.
 */
export type EventDefinition = [
  eventType: string,
  target: string | Element | Window,
  handler: Function,
];

/**
 * List of custom events to be registered in a component.
 */
export type Events = Array<EventDefinition>;

/**
 * Definition of a declarative component, registered via `Koppa.take(...)`.
 */
export interface ComponentSource {
  path: string; // Path to the source file (optional, useful for debugging)
  template: string; // HTML template as a string
  script: string; // Inline JavaScript defining data/methods/etc.
  style: string; // CSS styles as a string
}

/**
 * Lifecycle hooks optionally used in components or plugins.
 */
export interface LifecycleHooks {
  created?: Function;
  beforeMount?: Function;
  mounted?: Function;
  beforeUpdate?: Function;
  updated?: Function;
  beforeDestroy?: Function;
  destroyed?: Function;
  processed?: Function;
}

/**
 * Names of all possible lifecycle hooks.
 */
export type LifecycleHook =
  | 'created'
  | 'beforeMount'
  | 'mounted'
  | 'beforeUpdate'
  | 'updated'
  | 'beforeDestroy'
  | 'destroyed'
  | 'processed';

/**
 * Structure of a component module returned by `stringToCode`.
 * This object contains all relevant configuration for a component.
 */
export interface Module extends LifecycleHooks {
  data: Data; // Reactive data model
  methods?: Methods; // Component methods
  props?: Props; // Declared props
  events?: Events; // Event bindings (e.g., [ "click", ".btn", handler ])
  watchList?: WatchList; // List of reactive paths to observe
}

/**
 * Definition of a plugin that can be registered via `Koppa.take(...)`.
 */
export interface IPlugin {
  name: string; // Unique plugin name
  version?: string; // Optional version string
  description?: string; // Optional description
  install(core: {
    registerGlobalHook: (hook: LifecycleHook, fn: Function) => void;
    take: (item: any, name?: string) => void;
  }): void; // Install function receives core context
  setup?(): Record<string, Function>; // Optional setup API available in component instances
}

/**
 * Runtime context object available inside a component instance.
 */
export interface Context {
  $refs: Refs; // Access to DOM references
  $parent?: Instance; // Optional reference to parent component
  $emit?: (eventName: string, ...args: any[]) => void; // Emit custom events
  $take: (pluginName: string) => Record<string, Function> | undefined; // Access to plugin APIs
}

/**
 * Initialization bundle used internally to create a component instance.
 * Can be used externally in advanced scenarios.
 */
export interface InstanceInitBundle {
  element: HTMLElement; // Root DOM element of the component
  template: HTMLTemplateElement; // Parsed HTML template
  script: string; // Inline script associated with the component
  parentInstance?: Instance; // Optional reference to parent instance (for nesting)
}

/**
 * Public API of the KoppaJS core framework – contains registered components, plugins, and modules.
 * The most important method is `take(...)` used to register all entities.
 */
export interface ICore {
  modules: Record<string, Function | Object>; // Global modules
  plugins: Record<string, IPlugin>; // Registered plugins
  components: Record<string, any>; // Registered components
  instances: Record<string, any>; // Active component instances
  take(item: any, name?: string): void; // Central registration method for components, plugins, and modules
}

/**
 * Combination of constructor and singleton instance for the framework.
 * Provided as the default export.
 */
export type CoreProxyType = (new (...args: any[]) => ICore) & ICore;

/**
 * Singleton instance of the KoppaJS framework.
 * Imported via `import Koppa from '@koppajs/core'`.
 */
declare const Koppa: CoreProxyType;
export default Koppa;
