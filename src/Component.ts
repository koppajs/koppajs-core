// 📁 `src/Components.ts`

import ExtensionRegistry from './ExtensionRegistry';
import Instance from './Instance';
import { generateCompactUniqueId } from './utils';

/**
 * Represents a custom web component that integrates with the Koppa framework.
 */
export default class Component {
  public name: string; // The name of the custom component
  private source: ComponentSource; // The source object containing template, style, and script definitions
  private template: HTMLTemplateElement = document.createElement('template'); // A template element for rendering the component

  /**
   * Creates an instance of Component and registers it as a custom element.
   *
   * This constructor initializes the component by accepting a global core context,
   * the unique name for the custom element, and a source object containing the template,
   * style, and script definitions. The core context is used for dependency injection,
   * providing access to global functions, configuration, or event handling that may be required
   * throughout the component’s lifecycle. After assigning the component name and source, it
   * immediately calls the registerComponent method to define the element with the browser’s
   * custom elements registry.
   *
   * @param {string} componentName - The unique name of the custom component.
   * @param {ComponentSource} source - The source object that holds the component's template, style, and script.
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
          this.instanceId = generateCompactUniqueId(); // Generate a unique identifier for the component instance
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
          const instance = (ExtensionRegistry.instances[this.instanceId] = new Instance(
            this,
            template,
            component.source.script,
            parentInstance,
          ));
          await instance.init(); // Initialize the instance
        }

        /**
         * Lifecycle method called when the component is removed from the DOM.
         * Cleans up the instance and removes unused styles.
         */
        async disconnectedCallback() {
          const instance = ExtensionRegistry.instances[this.instanceId!];
          await instance?.lifecycleManager.callHook('beforeDestroy'); // Trigger beforeDestroy hook

          // Remove styles if there are no more instances of the component in the DOM
          if (!document.body.select(component.name)) {
            document.head.select(`style#${component.name}`)?.remove();
          }

          delete ExtensionRegistry.instances[this.instanceId!]; // Remove the instance from global storage
          await instance?.lifecycleManager.callHook('destroyed'); // Trigger destroyed hook
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
    const selector = Object.keys(ExtensionRegistry.components)
      .map((tag) => tag.toLowerCase())
      .join(',');
    const parent = element.closest(selector) as HTMLElement | null;
    return parent?.instance ? ExtensionRegistry.instances[parent.instance] : undefined;
  }
}
