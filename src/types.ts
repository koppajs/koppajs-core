// src/types.ts

/// <reference path="./globals.d.ts" />
/// <reference types="vite/client" />

export type ModelCallback = (oldValue?: any, newValue?: any) => void;

export type TakeArgs = [ComponentSource, string] | [IPlugin | IModule];

export interface CoreCallable {
  (): void;
  take: {
    (component: ComponentSource, name: string): void;
    (pluginOrModule: IPlugin | IModule): void;
  };
}

export type LifecycleRegistry = Map<LifecycleHook, Set<HookCallback>>;

export type HookCallback = (context?: Data | undefined) => Promise<void>;

export interface CoreCtx {
  registerHook: (hookName: LifecycleHook, callback: HookCallback) => void;
  take: CoreCallable['take'];
}

// Basic‐Extension‐Interface
export interface IBaseExtension {
  name: string;
  install(context: CoreCtx): (() => any) | void;
}

// Plugin‐Extension-Interface
export interface IPlugin extends IBaseExtension {
  setup(this: Data): Record<string, any> | (() => any);
  attach: never;
}

export interface ModuleContext {
  element: HTMLElement;
  parent?: ComponentInstance;
  core: {
    take: CoreCallable['take'];
  };
}

// Module‐Extension-Interface
export interface IModule extends IBaseExtension {
  attach(this: ModuleContext): Record<string, any> | void;
  setup?: never;
}

// Component-Source-Interface
export interface ComponentSource {
  template: string;
  script: string;
  style: string;
}

// Extension-Interface
export type IExtension = ComponentSource | IPlugin | IModule;

interface PropsDefinition {
  type?: string;
  required?: boolean;
  default?: any;
  regex?: string;
}

export type EventDefinition = [
  string,
  string | Element | Window | { ref: string; selector?: string },
  Function,
];

export type Data = Record<string, any>;
export type Methods = Record<string, Function>;
export type Props = Record<string, PropsDefinition>;
export type Events = Array<EventDefinition>;
export type WatchList = string[];

export type Refs = Record<string, HTMLElement>;

export const lifecycleHooks = [
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'processed',
] as const;

export type LifecycleHook = (typeof lifecycleHooks)[number];

interface LifecycleHooks {
  created?: Function;
  beforeMount?: Function;
  mounted?: Function;
  beforeUpdate?: Function;
  updated?: Function;
  beforeDestroy?: Function;
  destroyed?: Function;
  processed?: Function;
}

export interface Lifecycle {
  on: (name: LifecycleHook, fn: (this: Data) => void | Promise<void>) => void;
  off: (name: LifecycleHook, fn: (this: Data) => void | Promise<void>) => void;
  clear: () => void;
  emit(hook: LifecycleHook): Promise<void>;
}

export type CompiledScript = (context: ComponentContext) => ComponentController;

export interface ComponentController extends LifecycleHooks {
  data: Data;
  methods?: Methods;
  props?: Props;
  events?: Events;
  watchList?: WatchList;
}

export interface ComponentContext {
  $refs: Refs;
  $parent?: ComponentInstance;
  $emit: (parent: ComponentInstance | undefined, eventName: string, ...args: any[]) => void;
  $take: (pluginName: string) => Record<string, any> | Function | void | undefined;
  $handleEventFromChild: (
    parent: ComponentInstance | undefined,
    data: Data,
    eventName: string,
    ...args: any[]
  ) => void;
  // Dynamische Module Properties
  [key: `$${string}`]: any;
}

export interface ComponentInstance
  extends ComponentContext,
    Omit<ComponentController, keyof LifecycleHooks> {
  element: HTMLElement;
  template: HTMLTemplateElement;
  readyPromise: Promise<void>;
  // lifecycle: Lifecycle;
  lifecycleRegistry: LifecycleRegistry;
}
