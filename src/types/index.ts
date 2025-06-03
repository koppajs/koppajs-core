// 📁 `src/types/index.ts`
// 📁 `src/types/index.ts`

type Refs = Record<string, HTMLElement>;

export interface ComponentSource {
  template: string;
  script: string;
  style: string;
}

export interface Context {
  $refs: Refs;
  $parent?: ComponentInstance;
  $emit: (eventName: string, ...args: any[]) => void;
  $take: (pluginName: string) => Record<string, Function> | Function | void | undefined;
}

export interface LifecycleHooks {
  created?: () => void | Promise<void>;
  beforeMount?: () => void | Promise<void>;
  mounted?: () => void | Promise<void>;
  beforeUpdate?: () => void | Promise<void>;
  updated?: () => void | Promise<void>;
  beforeDestroy?: () => void | Promise<void>;
  destroyed?: () => void | Promise<void>;
  processed?: () => void | Promise<void>;
}

export interface ComponentController extends LifecycleHooks {
  data: Data;
  methods?: Methods;
  props?: Props;
  events?: Events;
  watchList?: WatchList;
  lifecycleHooks?: LifecycleHooks;
}

export interface ComponentInstance {
  element: HTMLElement;
  template: HTMLTemplateElement;
  parent?: ComponentInstance;
  data: Data;
  methods?: Methods;
  props?: Props;
  events?: Events;
  watchList?: WatchList;
  refs: Refs;
  emit: (eventName: string, ...args: any[]) => void;
  take: (pluginName: string) => Record<string, Function> | Function | void | undefined;
  readyPromise: Promise<void>;
  lifecycleHooks?: LifecycleHooks;
}
