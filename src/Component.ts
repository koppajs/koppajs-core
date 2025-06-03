// 📁 `src/Components.ts`

import ExtensionRegistry from './ExtensionRegistry';
import Instance from './Instance';
import { generateCompactUniqueId } from './utils';

export default class Component {
  public name: string; // The name of the custom component
  private source: ComponentSource; // The source object containing template, style, and script definitions
  private template: HTMLTemplateElement = document.createElement('template'); // A template element for rendering the component

  constructor(componentName: string, source: ComponentSource) {
    this.source = source;
    this.name = componentName;
    this.registerComponent();
  }

  private registerComponent() {
    const component = this;

    customElements.define(
      this.name,
      class extends HTMLElement {
        private instanceId?: string; // Unique instance identifier

        constructor() {
          super();
        }

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

          // TODO: also hier den prozess hinein packen:
          // const module = await stringToCode(
          //         this.script,
          //         {
          //           $refs: this.refs,
          //           $parent: this.parent,
          //           $emit: this.emit,
          //           $take: this.take,
          //         },
          //       );

          // Clone the template and create an instance of the component
          const template = component.template.cloneNode(true) as HTMLTemplateElement;
          const instance = (ExtensionRegistry.instances[this.instanceId] = new Instance(
            this,
            template,
            component.source.script, // TODO: das hier wird das verarbeitete script mmodel und heißt dan controller
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
