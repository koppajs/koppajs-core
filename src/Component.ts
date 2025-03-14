// 📁 `src/Components.ts`
/// <reference path="../types.d.ts" />

import Instance from './Instance';
import { v4 as uuidv4 } from 'uuid';

/**
 * Represents a custom web component that integrates with the Koppa framework.
 */
export default class Component {
  public name: string; // The name of the custom component
  private source: ComponentSource; // The source object containing template, style, and script definitions
  private template: HTMLTemplateElement = document.createElement('template'); // A template element for rendering the component

  /**
   * Creates an instance of Component and registers it as a custom element.
   * @param {string} componentName - The name of the custom component.
   * @param {ComponentSource} source - The source object containing the component's template, style, and script.
   */
  constructor(componentName: string, source: ComponentSource) {
    this.source = source;
    this.name = componentName;
    this.registerComponent();
  }

  /**
   * Registers the component as a custom web element.
   */
  private registerComponent() {
    const component = this;

    customElements.define(
      this.name,
      class extends HTMLElement {
        private instanceId?: string; // Unique instance identifier

        constructor() {
          super();
        }

        /**
         * Lifecycle method called when the component is added to the DOM.
         * Initializes the component instance and attaches styles and templates.
         */
        async connectedCallback() {
          this.instanceId = uuidv4(); // Generate a unique identifier for the component instance
          const parentInstance = component.getParentInstance(this); // Retrieve the parent instance if available

          // Ensure the template has content before cloning it
          if (!component.template.content.hasChildNodes()) {
            component.template.innerHTML = component.source.template;
          }

          // Append styles if they are not already present in the document head
          if (!document.head.select(`style#${component.name}`)) {
            const style = document.createElement('style');
            style.id = component.name;
            style.textContent = component.source.style;
            document.head.append(style);
          }

          // Clone the template and create an instance of the component
          const template = component.template.cloneNode(true) as HTMLTemplateElement;
          const instance = (window.koppa.instances[this.instanceId] = new Instance({
            element: this,
            template,
            script: component.source.script,
            parentInstance,
          }));
          await instance.init(); // Initialize the instance
        }

        /**
         * Lifecycle method called when the component is removed from the DOM.
         * Cleans up the instance and removes unused styles.
         */
        disconnectedCallback() {
          const instance = window.koppa.instances[this.instanceId!];
          instance?.lifecycleManager.callHook('beforeDestroy'); // Trigger beforeDestroy hook

          // Remove styles if there are no more instances of the component in the DOM
          if (!document.body.select(component.name)) {
            document.head.select(`style#${component.name}`)?.remove();
          }

          delete window.koppa.instances[this.instanceId!]; // Remove the instance from global storage
          instance?.lifecycleManager.callHook('destroyed'); // Trigger destroyed hook
        }
      },
    );
  }

  /**
   * Retrieves the parent instance of the component, if it exists.
   * @param {HTMLElement} element - The current component element.
   * @returns {Instance | undefined} - The parent instance if found, otherwise undefined.
   */
  private getParentInstance(element: HTMLElement): Instance | undefined {
    // Build a selector list of all registered Koppa components
    const selector = Object.keys(window.koppa.components)
      .map((tag) => tag.toLowerCase())
      .join(',');
    const parent = element.closest(selector) as HTMLElement | null;
    return parent?.instance ? window.koppa.instances[parent.instance] : undefined;
  }
}
