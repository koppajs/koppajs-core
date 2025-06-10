// Internal TypeScript Definitions for KoppaJS Core
// -----------------------------------------------

/**
 * Internal instance interface used during component setup and runtime.
 */
export interface Instance {
  element: HTMLElement;
  template: HTMLTemplateElement;
  parent?: Instance;
  readyPromise: Promise<void>;
  init(): Promise<void>;
  handleEventFromChild(eventName: string, ...args: any[]): void;
}

/**
 * Internal plugin setup function, returns reusable helpers for component logic.
 */
export type PluginSetupFunction = () => Record<string, Function>;

/**
 * Represents a reactive model used internally by the framework.
 */
export interface ReactiveModel<T = any> {
  data: T;
  addObserver(observer: () => void): void;
  removeObserver(observer: () => void): void;
  watch(path: string, deep?: boolean): void;
  unwatch(path: string): void;
  getWatchList(): { parent: object; properties: string[] }[];
}

/**
 * Callback type used internally when reactive values change.
 */
export type Callback = (oldValue?: any, newValue?: any) => void;

/**
 * Interface for lifecycle hook storage inside LifecycleManager.
 */
export type LifecycleHookMap = Partial<Record<LifecycleHook, [Function, Data]>>;

/**
 * Template processor used for rendering HTML with data binding and directives.
 */
export interface ITemplateProcessor {
  processTemplate(rootElement: Node, data: Data, refs: Refs): Promise<void>;
}

/**
 * Handles DOM event setup and propagation in a component instance.
 */
export interface IEventHandler {
  setupEvents(events: Events, container: DocumentFragment, refs: Refs): void;
  bindNativeEvents(fragment: DocumentFragment): void;
  emit(eventName: string, ...args: any[]): void;
}

/**
 * Internal format used by stringToCode to evaluate component module scripts.
 */
export type ScriptEvaluator = (
  context: Context,
  modules: Record<string, Function | Object>,
) => Module;

/**
 * Utility function to evaluate expressions inside templates.
 */
export type ExpressionEvaluator = (expression: string, data?: Record<string, any>) => any;
