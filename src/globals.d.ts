/// <reference types="vite/client" />

import { CoreType } from '.';
import type ComponentClass from './Component';
import type InstanceClass from './Instance';
import { HookCallback } from './utils/HookRegistry';

declare global {
  /**
   * Alias for the Component class exported from './Component'.
   * This allows referring to the type simply as `Component` throughout the app.
   */
  type Component = ComponentClass;

  /**
   * Alias for the Instance class exported from './Instance'.
   * Used to type references to running component instances.
   */
  type Instance = InstanceClass;

  /**
   * Extend the built-in HTMLElement interface with our utility methods.
   */
  interface HTMLElement {
    /**
     * Query and return the first matching descendant element.
     * If called on an <input> or <textarea>, selects its text instead.
     * @param selector - CSS selector string
     * @returns the first matching HTMLElement or null/void if none
     */
    select(selector: string): HTMLElement | null | void;

    /**
     * Query and return all matching descendant nodes.
     * @param selector - CSS selector string
     * @returns a NodeList of matching elements
     */
    selectAll(selector: string): NodeList;

    /**
     * Add one or more CSS classes to the element.
     * @param classes - space-delimited list of class names
     * @returns the element, for chaining
     */
    addClass(classes: string): HTMLElement;

    /**
     * Remove one or more CSS classes from the element.
     * @param classes - space-delimited list of class names
     * @returns the element, for chaining
     */
    removeClass(classes: string): HTMLElement;

    /**
     * Toggle one or more CSS classes on the element.
     * @param classes - space-delimited list of class names
     * @returns the element, for chaining
     */
    toggleClass(classes: string): HTMLElement;

    /**
     * Check if the element has the given CSS class.
     * @param className - name of the class to test
     * @returns true if present, false otherwise
     */
    hasClass(className: string): boolean;

    /**
     * Replace this element in the DOM with another element or raw HTML/text.
     * @param newNode - HTMLElement or HTML string to insert
     */
    replaceWith(newNode: HTMLElement | string): void;

    /**
     * Get all sibling elements of this node.
     * Optionally, invoke a callback for each sibling.
     * @param callback - optional function to receive each sibling
     * @returns an array of sibling HTMLElements
     */
    siblings(callback?: (sibling: HTMLElement) => void): HTMLElement[];

    /**
     * Insert a new node or HTML string immediately before this element.
     * @param newNode - HTMLElement or HTML string to insert
     */
    before(newNode: HTMLElement | string): void;

    /**
     * Insert a new node or HTML string immediately after this element.
     * @param newNode - HTMLElement or HTML string to insert
     */
    after(newNode: HTMLElement | string): void;

    /**
     * Get or set an attribute on the element.
     * @param attrName - attribute name
     * @param attrValue - if provided, sets the attribute to this value
     * @returns the current value, or null/undefined if not set
     */
    attr(attrName: string, attrValue?: string): string | undefined;

    /**
     * Optional field used by the framework to store an instance identifier
     * on the element once it has been upgraded to a custom component.
     */
    instance?: string;
  }

  interface CoreCtx {
    registerHook: (hookName: string, callback: HookCallback<any>) => void;
    take?: CoreType['take'];
  }

  type ComponentCtx = Record<string, any>;

  interface IPlugin {
    name: string;
    install(context: CoreCtx): (() => any) | void;
    setup?(context: ComponentCtx): Record<string, any> | (() => any) | void;
  }

  interface IModule {
    name: string;
    initialize(context: CoreCtx): (() => any) | void;
    attach?(): Record<string, any> | (() => any);
  }

  interface ComponentSource {
    template: string;
    script: string;
    style: string;
  }

  /** Shorthand for mapping method names to functions. */
  type Methods = Record<string, Function>;
  /** Shorthand for mapping data keys to arbitrary values. */
  type Data = Record<string, any>;
  /** Shorthand for mapping prop names to their definitions. */
  type Props = Record<string, PropsDefinition>;
  /** Array of declarative event-binding tuples. */
  type Events = Array<EventDefinition>;

  /**
   * One event-binding tuple:
   * [ eventType, target, handlerFunction ]
   */
  type EventDefinition = [
    /** e.g. "click", "submit" */
    string,
    /** CSS selector, Element, Window, or { ref, selector? } */
    string | Element | Window | { ref: string; selector?: string },
    /** Function to be invoked when the event fires */
    Function,
  ];

  /**
   * Definition for a single prop:
   * - type: expected JS type (string|number|boolean|etc)
   * - required: must be provided by the user
   * - default: fallback value
   * - regex: optional pattern for string props
   */
  interface PropsDefinition {
    type?: string;
    required?: boolean;
    default?: any;
    regex?: string;
  }

  /** Map of ref names to actual HTMLElements inside a component. */
  type Refs = Record<string, HTMLElement>;
  /** List of property paths to observe for reactive updates. */
  type WatchList = string[];

  /**
   * Execution context available inside compiled component scripts.
   */
  interface Context {
    /** Access to elements marked with `ref` */
    $refs: Refs;
    /** Optional reference to the parent component instance */
    $parent?: Instance;
    /** Function to emit custom events upward */
    $emit?: (eventName: string, ...args: any[]) => void;
    /** Access APIs provided by plugins */
    $take: (pluginName: string) => Record<string, Function> | Function | void | undefined;
  }

  /**
   * Names of lifecycle hooks recognized by the framework.
   */
  type LifecycleHook =
    | 'created'
    | 'beforeMount'
    | 'mounted'
    | 'beforeUpdate'
    | 'updated'
    | 'beforeDestroy'
    | 'destroyed'
    | 'processed';

  /**
   * Optional hook methods that a component or module can define.
   * These will be called at the appropriate lifecycle stage.
   */
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

  /**
   * Shape of the object returned by compiling component scripts via `stringToCode`.
   */
  interface Module extends LifecycleHooks {
    /** Initial reactive data model */
    data: Data;
    /** Methods bound to the data context */
    methods?: Methods;
    /** Prop definitions for validation */
    props?: Props;
    /** Declarative event bindings */
    events?: Events;
    /** List of additional paths to watch reactively */
    watchList?: WatchList;
  }
}

export {};
