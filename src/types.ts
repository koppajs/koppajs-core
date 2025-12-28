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

export {}

/* -------------------------------------------------------------------------- */
/*  Ambient Module Declarations                                               */
/* -------------------------------------------------------------------------- */

import './kpa.d.ts'

/* -------------------------------------------------------------------------- */
/*  Global Augmentations                                                      */
/* -------------------------------------------------------------------------- */

import './globals.d.ts'

/* -------------------------------------------------------------------------- */
/*  Public Core Types                                                         */
/* -------------------------------------------------------------------------- */

export const EVENT_STORE: unique symbol = Symbol('eventStore')

export type TakeArgs = [ComponentSource, string] | [IPlugin | IModule]

export type AnyFn = (...args: any[]) => unknown

export interface CoreCallable {
  (): void
  take: {
    (component: ComponentSource, name: string): void
    (pluginOrModule: IPlugin | IModule): void
  }
}

export type LifecycleRegistry = Map<LifecycleHook, Set<HookCallback>>

export type HookCallback = (context?: Data | undefined) => Promise<void>

export interface CoreCtx {
  registerHook: (hookName: LifecycleHook, callback: HookCallback) => void
  take: CoreCallable['take']
}

/* -------------------------------------------------------------------------- */
/*  Extensions                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Shared base extension interface.
 */
export interface IBaseExtension {
  name: string
  install(context: CoreCtx): (() => any) | void
}

/**
 * Plugin extension interface.
 */
export interface IPlugin extends IBaseExtension {
  setup(this: Data): Record<string, any> | (() => any)
  attach: never
}

/**
 * Internal helper type (no global augmentation of HTMLElement required).
 */
export type HTMLElementWithInstance = HTMLElement & {
  instance?: ComponentInstance
}

export interface ModuleContext {
  element: HTMLElementWithInstance
  parent?: ComponentInstance
  core: {
    take: CoreCallable['take']
  }
}

/**
 * Module extension interface.
 */
export interface IModule extends IBaseExtension {
  attach(this: ModuleContext): Record<string, any> | void
  setup?: never
}

/**
 * Component source interface.
 * This is the payload produced by the Vite plugin for `.kpa` files.
 */
export interface ComponentSource {
  template: string
  script: string
  style: string

  /**
   * Optional sourcemap payload (as JSON string) for dynamic script execution.
   * The core runtime may re-attach this map for DevTools when evaluating scripts.
   */
  scriptMap?: string | null
}

/**
 * Public extension union.
 */
export type IExtension = ComponentSource | IPlugin | IModule

/* -------------------------------------------------------------------------- */
/*  Component Types                                                           */
/* -------------------------------------------------------------------------- */

interface PropsDefinition {
  type?: string
  required?: boolean
  default?: any
  regex?: string
}

export type EventDefinition = [
  string,
  string | Element | Window | { ref: string; selector?: string },
  AnyFn,
]

export type Data = Record<string, any>
export type Methods = Record<string, AnyFn>
export type Props = Record<string, PropsDefinition>
export type Events = Array<EventDefinition>
export type WatchList = string[]

export type Refs = Record<string, HTMLElement>

export const lifecycleHooks = [
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'processed',
] as const

export type LifecycleHook = (typeof lifecycleHooks)[number]
export type LifecycleHandler = (this: Data) => void | Promise<void>

interface LifecycleHooks {
  created?: LifecycleHandler
  beforeMount?: LifecycleHandler
  mounted?: LifecycleHandler
  beforeUpdate?: LifecycleHandler
  updated?: LifecycleHandler
  beforeDestroy?: LifecycleHandler
  destroyed?: LifecycleHandler
  processed?: LifecycleHandler
}

export interface Lifecycle {
  on: (name: LifecycleHook, fn: (this: Data) => void | Promise<void>) => void
  off: (name: LifecycleHook, fn: (this: Data) => void | Promise<void>) => void
  clear: () => void
  emit(hook: LifecycleHook): Promise<void>
}

export type CompiledScript = (context: ComponentContext) => ComponentController

export interface ComponentController extends LifecycleHooks {
  data: Data
  methods?: Methods
  props?: Props
  events?: Events
  watchList?: WatchList
}

export interface ComponentContext {
  $refs: Refs
  $parent?: ComponentInstance
  $emit: (
    parent: ComponentInstance | undefined,
    eventName: string,
    ...args: any[]
  ) => void
  $take: (pluginName: string) => Record<string, any> | AnyFn | void | undefined
  $handleEventFromChild: (
    parent: ComponentInstance | undefined,
    data: Data,
    eventName: string,
    ...args: any[]
  ) => void

  // Dynamic module properties ($router, $store, ...)
  [key: `$${string}`]: any
}

export interface ComponentInstance
  extends ComponentContext,
    Omit<ComponentController, keyof LifecycleHooks> {
  element: HTMLElementWithInstance
  template: HTMLTemplateElement
  readyPromise: Promise<void>
  lifecycleRegistry: LifecycleRegistry
}
