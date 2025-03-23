// 📁 `src/Instance.ts`

import { Model } from './Model';

import { LifecycleManager } from './LifecycleManager';
import { TemplateProcessor } from './TemplateProcessor';
import { EventHandler } from './EventHandler';
import { bindMethods, kebabToCamel, stringToCode } from './utils';

/**
 * Class representing a single instance of a component.
 * It manages lifecycle events, reactivity, and rendering.
 *
 * @template T - Type of the component's reactive data model.
 */
export default class Instance<T extends Record<string, any> = Record<string, any>> {
  /** Root element of the component */
  public element: HTMLElement;

  /** Template associated with the component */
  public template: HTMLTemplateElement;

  /** Inline script defining the component's behavior */
  private script: string;

  /** Reference to the parent instance, if applicable */
  public parent?: Instance;

  /** Document fragment used as a container for rendering */
  private container?: DocumentFragment;

  /** Reactive data model */
  private data: Data = {};

  /** Component's method collection */
  private methods: Methods = {};

  /** Properties (props) passed to the component */
  private props: Props = {};

  /** References to child elements inside the template */
  private refs: Refs = {};

  /** List of watched properties for reactivity */
  private watchList: WatchList = [];

  /** Events handled by the component */
  private events: Events = [];

  /** Promise that resolves when the component is ready */
  public readyPromise: Promise<void>;

  /** Internal resolve function for the readyPromise */
  private readyResolve?: Function;

  /** ID of the pending render request for animation frame */
  private renderRequestId: number | null = null;

  /** Cached stringified representation of last rendered data */
  private lastRenderedData: string = '';

  /** Flag indicating if the component is currently rendering */
  private isRendering: boolean = false;

  /** Flag indicating if the component is mounted in the DOM */
  private isMounted: boolean = false;

  /** Managers for lifecycle, templating, and event handling */
  public lifecycleManager!: LifecycleManager;
  private templateProcessor!: TemplateProcessor;
  private eventHandler!: EventHandler;

  /** Event emitter function */
  private emit!: (eventName: string, ...args: any[]) => void;

  /** Handles events propagated from child components */
  public handleEventFromChild!: (eventName: string, ...args: any[]) => void;

  private core: Record<string, Function>; // The core context

  /**
   * Initializes an instance with the provided configuration.
   * @param {InstanceInitBundle} bundle - Initialization parameters for the instance.
   */
  constructor(core: Record<string, Function>, bundle: InstanceInitBundle) {
    this.core = core;
    this.element = bundle.element;
    this.template = bundle.template;
    this.script = bundle.script;
    this.parent = bundle.parentInstance;

    this.readyPromise = new Promise<void>((resolve) => (this.readyResolve = resolve));
  }

  /**
   * Processes and assigns props from attributes on the root element.
   * This method ensures that required props are present and assigns default values when needed.
   */
  private processProps(): void {
    const hasDefinedProps = Object.keys(this.props).length > 0;

    Array.from(this.element.attributes).forEach((attr) => {
      const isDynamic = attr.name.startsWith(':');
      const propName = kebabToCamel(attr.name.substring(isDynamic ? 1 : 0));
      const value = isDynamic ? this.parent?.data[propName] : attr.value !== '' ? attr.value : true; // Statische Props ohne `:`

      if (!hasDefinedProps || (this.props[propName] && this.validateProp(propName, value))) {
        (this.data as Record<string, any>)[propName] = value;
      }
    });

    // Assign default values for missing props or log errors for required ones
    for (const [propName, propOptions] of Object.entries(this.props)) {
      if (!(propName in this.data)) {
        if (propOptions.default !== undefined) {
          this.data[propName] = propOptions.default;
        } else if (propOptions.required) {
          console.error(`❌ Required prop "${propName}" is missing.`);
        }
      }
    }
  }

  /**
   * Validates the type and format of a given prop.
   * Ensures that the value matches the expected type and optional regex pattern.
   *
   * @param {string} propName - The name of the prop to validate.
   * @param {any} propValue - The value of the prop.
   * @returns {boolean} - Whether the prop is valid.
   */
  private validateProp(propName: string, propValue: any): boolean {
    const propOptions = this.props?.[propName];
    const pValue = propValue ?? propOptions?.default;
    if (!propOptions) return true;

    if (propOptions.type) {
      let isValidType = false;

      const expectedType =
        typeof propOptions.type === 'string'
          ? propOptions.type.toLowerCase()
          : (propOptions.type as Function).name.toLowerCase();

      const actualType = Array.isArray(pValue) ? 'array' : typeof pValue;

      switch (expectedType) {
        case 'string':
          isValidType = actualType === 'string';
          break;
        case 'number':
          isValidType = actualType === 'number';
          break;
        case 'boolean':
          isValidType = actualType === 'boolean';
          break;
        case 'array':
          isValidType = Array.isArray(pValue);
          break;
        case 'object':
          isValidType = actualType === 'object' && pValue !== null && !Array.isArray(pValue);
          break;
        case 'function':
          isValidType = actualType === 'function';
          break;
        default:
          console.error(`❌ Invalid type definition for prop "${propName}".`);
          return false;
      }

      if (!isValidType) {
        console.error(
          `❌ Prop "${propName}" should be of type "${expectedType}", but got "${actualType}".`,
          pValue,
        );
        return false;
      }
    }

    if (
      propOptions.regex &&
      typeof pValue === 'string' &&
      !new RegExp(propOptions.regex).test(pValue)
    ) {
      console.error(`❌ Prop "${propName}" does not match regex "${propOptions.regex}".`);
      return false;
    }

    return true;
  }

  /**
   * Initializes the watch list for the given model.
   * This method ensures that all properties marked as `props` and those in `watchList`
   * are observed for changes within the model.
   *
   * @private
   * @param {Model<T>} model - The reactive model instance to observe properties on.
   */
  private setupWatchList(model: Model<T>): void {
    const propsKeys = Object.keys(this.props); // Retrieve property names defined in `props`.
    const watchSet = new Set(this.watchList); // Create a set from the existing watch list.

    // Add properties from `props` to the watch list.
    propsKeys.forEach((propName) => {
      model.watch(propName); // Start observing the property.
      watchSet.delete(propName); // Prevent duplicate observation.
    });

    // Observe any remaining paths in the watch list.
    (watchSet as Set<string>).forEach((path: string) => model.watch(path));
  }

  private take(pluginName: string) {
    const plugin = window.koppa.plugins[pluginName];
    if (plugin && typeof plugin.setup === 'function') {
      return plugin.setup.call(this.data);
    }
    return undefined;
  }

  /**
   * Processes the slot elements within the component and replaces them
   * with the provided content from the child nodes of the current component.
   * This method ensures that named slots and the default slot are correctly assigned.
   *
   * @private
   * @param {DocumentFragment} container - The container fragment where slots are defined.
   */
  private processSlots(container: DocumentFragment): void {
    // Collect all child nodes that provide slot content (elements or text nodes)
    const slotContent = Array.from(this.element.childNodes).filter(
      (node) => node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE,
    );

    // Map slot names to their corresponding content nodes
    const slotMap: { [key: string]: Node[] } = {};

    slotContent.forEach((node) => {
      if (node instanceof HTMLElement && node.hasAttribute('slot')) {
        const slotName = node.getAttribute('slot')!; // Get the slot name
        if (!slotMap[slotName]) {
          slotMap[slotName] = []; // Initialize array for this slot name
        }
        slotMap[slotName]!.push(node);
      } else {
        // Assign content to the default slot if no `slot` attribute is present
        if (!slotMap['default']) {
          slotMap['default'] = [];
        }
        slotMap['default']!.push(node);
      }
    });

    // Locate all <slot> elements in the component template
    container.querySelectorAll('slot').forEach((slotElement) => {
      const slotName = slotElement.getAttribute('name') || 'default'; // Default to unnamed slot
      const replacementNodes = slotMap[slotName];

      if (replacementNodes && replacementNodes.length > 0) {
        // Replace the <slot> element with the provided content
        replacementNodes.forEach((node) => {
          slotElement.parentNode!.insertBefore(node, slotElement); // Move node to the slot location
        });
      }

      // Remove the original <slot> element from the DOM
      slotElement.parentNode!.removeChild(slotElement);
    });
  }

  /**
   * Handles the rendering process of the component. Ensures that rendering is not triggered multiple times
   * simultaneously and applies changes efficiently using requestAnimationFrame.
   * @private
   * @async
   * @returns {Promise<void>} A promise that resolves once rendering is complete.
   */
  private async render(): Promise<void> {
    // Prevent redundant renders if a render process is already ongoing.
    if (this.isRendering) {
      if (this.renderRequestId) cancelAnimationFrame(this.renderRequestId);
      this.renderRequestId = requestAnimationFrame(() => this.render());
      return;
    }

    // Capture current data state for change detection.
    const currentData = JSON.stringify(this.data);
    if (this.lastRenderedData === currentData) {
      return; // Skip rendering if there are no changes.
    }

    this.isRendering = true;

    // Clone the template content for safe manipulation.
    this.container = this.template.content.cloneNode(true) as DocumentFragment;

    // Process slots and dynamic placeholders inside the template.
    this.processSlots(this.container);

    // Process the template with the provided data and references.
    await this.templateProcessor
      .processTemplate(this.container, this.data, this.refs)
      .catch((error) => {
        console.error('❌ Error in processTemplate:', error);
      });

    // Bind native and custom events.
    this.eventHandler.bindNativeEvents(this.container);
    this.eventHandler.setupEvents(this.events, this.container, this.refs);

    // Efficiently replace the current element's content with the processed template.
    this.element.replaceChildren(this.container);

    // Trigger lifecycle hook if the component is already mounted.
    if (this.isMounted) this.lifecycleManager.callHook('updated');

    this.isRendering = false;
  }

  /**
   * Initializes the component by setting up its data model, methods, event handling, and lifecycle hooks.
   * Ensures that all dependencies are loaded before the component is initialized.
   * @public
   * @async
   * @returns {Promise<void>} A promise that resolves once initialization is complete.
   */
  public async init(): Promise<void> {
    try {
      // Wait for the parent component to be ready (if applicable).
      await this.parent?.readyPromise;

      // Convert the script into an executable module with references to essential objects.
      const module = await stringToCode(
        this.script,
        {
          $refs: this.refs,
          $parent: this.parent,
          $emit: this.emit,
          $take: this.take,
        },
        window.koppa.modules,
      );

      // Create a reactive data model with an observer triggering re-renders on change.
      const model: Model<T> = new Model(module.data as T, (_oldValue?: any, _newValue?: any) => {
        requestAnimationFrame(() => this.render());
      });

      // Add an observer to batch updates and optimize rendering.
      let renderScheduled = false;
      model.addObserver(() => {
        if (!renderScheduled) {
          renderScheduled = true;
          requestAnimationFrame(() => {
            this.render();
            renderScheduled = false;
          });
        }
      });

      // Assign processed data and module properties.
      this.data = model.data;
      this.methods = module.methods ?? {};
      this.props = module.props ?? {};
      this.events = module.events ?? [];
      this.watchList = module.watchList ?? [];

      // Process component properties.
      this.processProps();

      // Bind defined methods to ensure correct context.
      bindMethods(this.data, this.methods);

      // Initialize lifecycle management and event handling.
      this.lifecycleManager = new LifecycleManager(this.core);
      this.templateProcessor = new TemplateProcessor();
      this.eventHandler = new EventHandler(this.parent, this.data);

      // Bind event emitter to instance.
      this.emit = this.eventHandler.emit.bind(this);

      // Setup property watchers.
      this.setupWatchList(model);

      // Register lifecycle hooks from the module.
      this.lifecycleManager.setupLifecycleHooks(this.data, module);

      // Execute lifecycle hooks for component creation and mounting.
      this.lifecycleManager.callHook('created');
      this.lifecycleManager.callHook('beforeMount');

      // Perform the initial render.
      await this.render();

      // If this is the first mount, trigger the mounted lifecycle hook.
      if (!this.isMounted) {
        this.lifecycleManager.callHook('mounted');
        this.isMounted = true;
      }

      // Resolve the ready promise to indicate initialization is complete.
      this.readyResolve!();
    } catch (error) {
      console.error('❌ Error during initialization:', error);
    }
  }
}
