/// <reference types="vite/client" />

import type ComponentClass from './Component';
import type InstanceClass from './Instance';

declare global {
  type Component = ComponentClass;
  type Instance = InstanceClass;

  interface HTMLElement {
    // Selects the first matching child element.
    select(selector: string): HTMLElement | null | void;
    // Selects all matching child elements.
    selectAll(selector: string): NodeList;
    // Adds one or more CSS classes.
    addClass(classes: string): HTMLElement;
    // Removes one or more CSS classes.
    removeClass(classes: string): HTMLElement;
    // Toggles one or more CSS classes.
    toggleClass(classes: string): HTMLElement;
    // Checks if the element has a specific CSS class.
    hasClass(className: string): boolean;
    // Replaces the element with a new element or HTML string.
    replaceWith(newNode: HTMLElement | string): void;
    // Retrieves all sibling elements; optionally executes a callback.
    siblings(callback?: (sibling: HTMLElement) => void): HTMLElement[];
    // Inserts a new element before the current element.
    before(newNode: HTMLElement | string): void;
    // Inserts a new element after the current element.
    after(newNode: HTMLElement | string): void;
    // Gets or sets an attribute; returns undefined if not set.
    attr(attrName: string, attrValue?: string): string | undefined;
    // Optional property for instance-specific data.
    instance?: string;
  }

  interface Window {
    koppa: {
      modules: Record<string, Function | Object>;
      plugins: Record<string, IPlugin>;
      components: Record<string, Component>;
      instances: Record<string, Instance>;
    };
  }

  interface InstanceInitBundle {
    element: HTMLElement;
    template: HTMLTemplateElement;
    script: string;
    parentInstance?: Instance;
  }

  interface ICore {
    modules: Record<string, Function | Object>;
    plugins: Record<string, IPlugin>;
    components: Record<string, Component>;
    instances: Record<string, Instance>;
    // Registers a component, module, or plugin.
    take(item: any, name?: string): void;
  }

  // Combines the constructor signature and instance properties of ICore.
  type CoreProxyType = (new (...args: any[]) => ICore) & ICore;

  interface IPlugin {
    name: string;
    version?: string;
    description?: string;
    // Installs the plugin with the core context.
    install(core: Record<string, Function>): void;
    // Optional setup method for component integration.
    setup?(): Record<string, Function>;
  }

  type Methods = Record<string, Function>;
  type Data = Record<string, any>;
  type Props = Record<string, PropsDefinition>;
  type Events = Array<EventDefinition>;

  type EventDefinition = [
    string,
    string | Element | Window | { ref: string; selector?: string },
    Function,
  ];

  interface ComponentSource {
    path: string;
    template: string;
    script: string;
    style: string;
  }

  interface PropsDefinition {
    type?: string;
    required?: boolean;
    default?: any;
    regex?: string;
  }

  type Refs = Record<string, HTMLElement>;
  type WatchList = string[];

  interface Context {
    $refs: Refs;
    $parent?: Instance;
    $emit?: (eventName: string, ...args: any[]) => void;
    // Retrieves a plugin's setup API by name.
    $take: (pluginName: string) => Record<string, Function> | undefined;
  }

  type LifecycleHook =
    | 'created'
    | 'beforeMount'
    | 'mounted'
    | 'updated'
    | 'beforeDestroy'
    | 'destroyed';

  interface Module extends LifecycleHooks {
    data: Data;
    methods?: Methods;
    props?: Props;
    events?: Events;
    watchList?: WatchList;
  }

  interface LifecycleHooks {
    created?: Function;
    beforeMount?: Function;
    mounted?: Function;
    updated?: Function;
    beforeDestroy?: Function;
    destroyed?: Function;
  }
}

export {};
