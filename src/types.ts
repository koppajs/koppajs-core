// Public type anchor for the entire KoppaJS ecosystem.
//
// This file intentionally contains:
// - The public runtime types (ComponentSource, CoreCallable, etc.)
// - Ambient declarations that must be visible to consumers (e.g. *.kpa modules)
// - Global augmentations (HTMLElement helpers)
//
// Rationale:
// TypeScript only loads what is reachable from the package's "types" entry
// (dist/index.d.ts). By placing ambient declarations here, they are guaranteed
// to be included for all consumers without requiring local project d.ts files.

export {};

/* -------------------------------------------------------------------------- */
/*  Ambient Module Declarations                                               */
/* -------------------------------------------------------------------------- */

import "./kpa.d.ts";

/* -------------------------------------------------------------------------- */
/*  Global Augmentations                                                      */
/* -------------------------------------------------------------------------- */

import "./globals.d.ts";

/* -------------------------------------------------------------------------- */
/*  Public Core Types                                                         */
/* -------------------------------------------------------------------------- */

// export const EVENT_STORE: unique symbol = Symbol("eventStore");

/**
 * Symbol to identify whether a function is bound to this.
 */
export const BOUND: unique symbol = Symbol("isBounded");

/**
 * Symbol to identify whether an object is a Proxy.
 */
export const IS_PROXY: unique symbol = Symbol("isProxy");

/**
 * Arguments for the Core.take() method.
 * Either a ComponentSource with a name, or a Plugin/Module.
 */
export type TakeArgs = [ComponentSource, string] | [IPlugin | IModule];

/**
 * Generic function type.
 */
export type AnyFn = (...args: any[]) => unknown;

/**
 * Function that has been bound to a context.
 */
export type BoundFn = AnyFn & { [BOUND]?: true };

/**
 * Main Core API interface.
 */
export interface CoreCallable {
  (): void;
  take: {
    (component: ComponentSource, name: string): void;
    (pluginOrModule: IPlugin | IModule): void;
  };
}

/**
 * Registry for lifecycle hooks.
 */
export type LifecycleRegistry = Map<LifecycleHook, Set<HookCallback>>;

/**
 * Callback function for lifecycle hooks.
 * @param context - Optional state context passed to the hook
 */
export type HookCallback = (context?: State | undefined) => Promise<void>;

/**
 * Context provided to plugins and modules during installation.
 */
export interface CoreCtx {
  registerHook: (hookName: LifecycleHook, callback: HookCallback) => void;
  take: CoreCallable["take"];
}

/* -------------------------------------------------------------------------- */
/*  Extensions                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Shared base extension interface.
 */
export interface IBaseExtension {
  /** Unique name of the extension */
  name: string;
  /**
   * Installation method called when extension is registered.
   * @param context - Core context with registration utilities
   * @returns Optional cleanup function
   */
  install(context: CoreCtx): (() => any) | void;
}

/**
 * Plugin extension interface.
 * Plugins provide setup methods that run in component context.
 */
export interface IPlugin extends IBaseExtension {
  /**
   * Setup method called for each component instance.
   * @this {State} - Component state as this context
   * @returns Plugin data or cleanup function
   */
  setup(this: State): Record<string, any> | (() => any);
  attach: never;
}

/**
 * Internal helper type (no global augmentation of HTMLElement required).
 */
export type HTMLElementWithInstance = HTMLElement & {
  instance?: ComponentInstance;
};

/**
 * Context provided to modules during attachment.
 */
export interface ModuleContext {
  element: HTMLElementWithInstance;
  parent?: ComponentInstance;
  core: {
    take: CoreCallable["take"];
  };
}

/**
 * Module extension interface.
 * Modules attach to component elements and provide element-level functionality.
 */
export interface IModule extends IBaseExtension {
  /**
   * Attach method called when component is created.
   * @this {ModuleContext} - Module context with element and parent
   * @returns Optional module data to attach to component
   */
  attach(this: ModuleContext): Record<string, any> | void;
  setup?: never;
}

/**
 * Component source interface.
 * This is the payload produced by the Vite plugin for `.kpa` files.
 */
export interface ComponentSource {
  template: string;
  script: string;
  style: string;

  /**
   * Optional sourcemap payload (as JSON string) for dynamic script execution.
   * The core runtime may re-attach this map for DevTools when evaluating scripts.
   */
  scriptMap?: string | null;

  /**
   * Component composition type.
   *
   * - "options" (default): Creates a userContext that combines methods and state, and binds it to this
   * - "composite": No userContext is created, no this binding occurs
   *
   * If not specified, defaults to "options".
   */
  type?: "options" | "composite";
}

/**
 * Public extension union.
 */
export type IExtension = ComponentSource | IPlugin | IModule;

/* -------------------------------------------------------------------------- */
/*  Component Types                                                           */
/* -------------------------------------------------------------------------- */

interface PropsDefinition {
  type?: string;
  required?: boolean;
  default?: any;
  regex?: string;
}

/**
 * Event definition tuple: [eventType, target, handler]
 * - eventType: DOM event name (e.g., "click", "input")
 * - target: Selector string, Element, Window, or ref object
 * - handler: Event handler function
 */
export type EventDefinition = [
  string,
  string | Element | Window | { ref: string; selector?: string },
  AnyFn,
];

/**
 * Component reactive state object.
 */
export type State = Record<string, any>;

/**
 * Component methods object.
 */
export type Methods = Record<string, AnyFn>;

/**
 * Component props definition.
 */
export type Props = Record<string, PropsDefinition>;

/**
 * Component events array.
 */
export type Events = Array<EventDefinition>;

/**
 * List of property paths to watch for changes.
 */
export type WatchList = string[];

/**
 * Snapshot of watched properties.
 */
export type WatchListSnapshot = { parent: object; properties: string[] };

/**
 * Component element references.
 */
export type Refs = Record<string, HTMLElement>;

/**
 * Options for composeBySource function.
 */
export type ComposeOptions = {
  /** Index of layer to write to when property doesn't exist in any layer */
  defaultWriteIndex?: number;
  /** Whether to include prototype properties in layer search */
  includePrototype?: boolean;
};

export const lifecycleHooks = [
  "created",
  "beforeMount",
  "mounted",
  "beforeUpdate",
  "updated",
  "beforeDestroy",
  "destroyed",
  "processed",
] as const;

/**
 * Available lifecycle hook names.
 */
export type LifecycleHook = (typeof lifecycleHooks)[number];

/**
 * Lifecycle hook handler function.
 * @this {State} - Component state as this context
 */
export type LifecycleHandler = (this: State) => void | Promise<void>;

interface LifecycleHooks {
  created?: LifecycleHandler;
  beforeMount?: LifecycleHandler;
  mounted?: LifecycleHandler;
  beforeUpdate?: LifecycleHandler;
  updated?: LifecycleHandler;
  beforeDestroy?: LifecycleHandler;
  destroyed?: LifecycleHandler;
  processed?: LifecycleHandler;
}

export interface Lifecycle {
  on: (name: LifecycleHook, fn: (this: State) => void | Promise<void>) => void;
  off: (name: LifecycleHook, fn: (this: State) => void | Promise<void>) => void;
  clear: () => void;
  emit(hook: LifecycleHook): Promise<void>;
}

/**
 * Context provided to component script during compilation.
 */
export interface ComponentContext {
  /** Element references */
  $refs: Refs;
  /** Parent component instance */
  $parent?: ComponentInstance;
  /** Emit event to parent components */
  $emit: (eventName: string, ...args: any[]) => void;
  /** Get plugin data */
  $take: (pluginName: string) => Record<string, any> | AnyFn | void | undefined;

  /** Dynamic module properties ($router, $store, ...) */
  [key: `$${string}`]: any;
}

/**
 * Compiled component script function.
 * @param context - Component context with $refs, $parent, etc.
 * @returns Component controller with state, methods, etc.
 */
export type CompiledScript = (context: ComponentContext) => ComponentController;

/**
 * Component controller returned from compiled script.
 * Contains component definition: state, methods, props, events, etc.
 */
export interface ComponentController extends LifecycleHooks {
  /** Component reactive state */
  state: State;
  /** User context (composed from methods + state for "options" type) */
  userContext?: State;
  /** Component methods */
  methods?: Methods;
  /** Component props definition */
  props?: Props;
  /** Component events */
  events?: Events;
  /** Properties to watch for changes */
  watchList?: WatchList;
}

/**
 * Runtime component instance.
 * Extends ComponentController with runtime properties like element, template, etc.
 */
export interface ComponentInstance
  extends ComponentContext, Omit<ComponentController, keyof LifecycleHooks> {
  element: HTMLElementWithInstance;
  template: HTMLTemplateElement;
  readyPromise: Promise<void>;
  lifecycleRegistry: LifecycleRegistry;
}
