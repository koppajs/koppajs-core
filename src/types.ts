export type TakeArgs = [ComponentSource, string] | [IPlugin | IModule];

export interface CoreCallable {
  (): void;
  take: {
    (component: ComponentSource, name: string): void;
    (pluginOrModule: IPlugin | IModule): void;
  };
}

export type HookCallback<T> = (context?: T) => any | Promise<any>;

export interface CoreCtx {
  registerHook: (hookName: string, callback: HookCallback<any>) => void;
  take: CoreCallable['take'];
}

type DataCtx = Record<string, any>;

// Basic‐Extension‐Interface
export interface IBaseExtension {
  name: string;
  install(context: CoreCtx): (() => any) | void;
}

// Plugin‐Extension-Interface
export interface IPlugin extends IBaseExtension {
  setup(context: DataCtx): Record<string, any> | (() => any);
  attach: never;
}

// Module‐Extension-Interface
export interface IModule extends IBaseExtension {
  attach(): Record<string, any> | (() => any);
  setup: never;
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

type EventDefinition = [
  string,
  string | Element | Window | { ref: string; selector?: string },
  Function,
];

export type Data = Record<string, any>;
type Methods = Record<string, Function>;
type Props = Record<string, PropsDefinition>;
type Events = Array<EventDefinition>;
type WatchList = string[];

export type LifecycleHook =
  | 'created'
  | 'beforeMount'
  | 'mounted'
  | 'beforeUpdate'
  | 'updated'
  | 'beforeDestroy'
  | 'destroyed'
  | 'processed';

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

export interface Module extends LifecycleHooks {
  data: Data;
  methods?: Methods;
  props?: Props;
  events?: Events;
  watchList?: WatchList;
}
