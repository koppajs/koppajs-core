/// <reference types="vite/client" />

import Component from './src/Component';
import Instance from './src/Instance';

declare global {
  /**
   * Extends the HTMLElement interface with utility methods for DOM manipulation.
   */
  interface HTMLElement {
    /** Selects the first matching child element. */
    select(selector: string): HTMLElement | null | void;

    /** Selects all matching child elements. */
    selectAll(selector: string): NodeList;

    /** Adds one or more CSS classes to the element. */
    addClass(classes: string): HTMLElement;

    /** Removes one or more CSS classes from the element. */
    removeClass(classes: string): HTMLElement;

    /** Toggles one or more CSS classes on the element. */
    toggleClass(classes: string): HTMLElement;

    /** Checks if the element has a specific CSS class. */
    hasClass(className: string): boolean;

    /** Replaces the current element with a new element or HTML string. */
    replaceWith(newNode: HTMLElement | string): void;

    /** Retrieves all sibling elements, optionally executing a callback for each. */
    siblings(callback?: (sibling: HTMLElement) => void): HTMLElement[];

    /** Inserts a new element before the current element. */
    before(newNode: HTMLElement | string): void;

    /** Inserts a new element after the current element. */
    after(newNode: HTMLElement | string): void;

    /**
     * Gets or sets an attribute on the element.
     * Returns undefined if no attribute is set.
     */
    attr(attrName: string, attrValue?: string): string | undefined;

    /** Optional property for storing instance-specific data. */
    instance?: string;
  }

  /**
   * Extends the global Window interface to include the Koppa framework instance.
   */
  interface Window {
    koppa: {
      /** Registered modules in the framework. */
      modules: Record<string, Function | Object>;

      /** Installed plugins in the framework. */
      plugins: Record<string, IPlugin>;

      /** Registered components within the framework. */
      components: Record<string, Component>;

      /** Active component instances. */
      instances: Record<string, Instance>;
    };
  }

  /**
   * Defines the structure for initializing a new component instance.
   */
  interface InstanceInitBundle {
    /** The root HTML element for the instance. */
    element: HTMLElement;

    /** The template used for rendering the instance. */
    template: HTMLTemplateElement;

    /** The associated JavaScript logic as a string. */
    script: string;

    /** Reference to the parent instance, if applicable. */
    parentInstance?: Instance;
  }

  /**
   * Interface representing the core of the framework.
   */
  interface ICore {
    /**
     * Contains all registered modules.
     */
    modules: Record<string, Function | Object>;

    /**
     * Contains all installed plugins.
     */
    plugins: Record<string, IPlugin>;

    /**
     * Contains all registered components.
     */
    components: Record<string, Component>;

    /**
     * Contains all active component instances.
     */
    instances: Record<string, Instance>;

    /**
     * Unified method for registering components, modules, or plugins.
     * Internally distinguishes between types based on the parameters.
     *
     * @param item - The item to register.
     * @param name - An optional name, primarily used for components.
     */
    take(item: any, name?: string): void;
  }

  /**
   * Interface representing a plugin for the framework.
   */
  interface IPlugin {
    /** The unique name of the plugin. */
    name: string;
    /** The version of the plugin. */
    version?: string;
    /** A brief description of the plugin. */
    description?: string;
    /**
     * Installs the plugin globally, receiving the core context.
     *
     * @param core - The global core context.
     */
    install(core: Record<string, Function>): void;
    /**
     * Optional setup method that is called when the plugin is integrated
     * into a component. It returns an object containing helper methods
     * that can be used within the component.
     */
    setup?(): Record<string, Function>;
  }

  /**
   * Represents the available methods within a component.
   */
  type Methods = Record<string, Function>;

  /**
   * Defines the structure of component data.
   */
  type Data = Record<string, any>;

  /**
   * Represents all property definitions in a component.
   */
  type Props = Record<string, PropsDefinition>;

  /**
   * Represents the structure of component event bindings.
   */
  type Events = Array<EventDefinition>;

  /**
   * Defines an event binding structure.
   */
  type EventDefinition = [
    string,
    string | Element | Window | { ref: string; selector?: string },
    Function,
  ];

  /**
   * Defines the structure of a component's source code.
   */
  interface ComponentSource {
    /** Path to the component file. */
    path: string;

    /** The HTML template of the component. */
    template: string;

    /** The associated JavaScript logic as a string. */
    script: string;

    /** The CSS styling of the component. */
    style: string;
  }

  /**
   * Defines the structure of a single prop in a component.
   */
  interface PropsDefinition {
    /** The expected data type (e.g., 'string', 'number', 'boolean'). */
    type?: string;

    /** Whether the prop is required. */
    required?: boolean;

    /** Default value for the prop. */
    default?: any;

    /** Regular expression pattern for validation. */
    regex?: string;
  }

  /**
   * Defines references to DOM elements inside a component.
   */
  type Refs = Record<string, HTMLElement>;

  /**
   * Represents a list of properties to watch for changes.
   */
  type WatchList = string[];

  /**
   * Defines the available context properties within a component instance.
   */
  interface Context {
    /** References to DOM elements in the component. */
    $refs: Refs;

    /** Reference to the parent instance, if applicable. */
    $parent?: Instance;

    /** Function to emit events to the parent instance. */
    $emit?: (eventName: string, ...args: any[]) => void;

    /**
     * Method to retrieve a plugin's setup API by name.
     *
     * @param pluginName - The name of the plugin.
     * @returns An object containing helper methods provided by the plugin.
     */
    $take: (pluginName: string) => Record<string, Function>;
  }

  /**
   * Lifecycle hooks available in components.
   */
  type LifecycleHook =
    | 'created'
    | 'beforeMount'
    | 'mounted'
    | 'updated'
    | 'beforeDestroy'
    | 'destroyed';

  /**
   * Defines the structure of a Koppa module.
   */
  interface Module extends LifecycleHooks {
    /** Component data properties. */
    data: Data;

    /** Component methods. */
    methods?: Methods;

    /** Component properties. */
    props?: Props;

    /** Component events. */
    events?: Events;

    /** Properties to watch for changes. */
    watchList?: WatchList;
  }

  /**
   * Defines lifecycle hooks available in a component.
   */
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
