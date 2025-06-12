import { Model } from './Model';
import { createLifecycleManager } from './lifecycle-manager';
import { createTemplateProcessor } from '../src/template-processor';
import { createEventHandler } from '../src/event-handler';
import { bindMethods, compileCode, kebabToCamel } from '../src/utils';
import ExtensionRegistry from './ExtensionRegistry';
import {
  CompiledScript,
  ComponentContext,
  ComponentController,
  ComponentInstance,
  Data,
  Events,
  Methods,
  Props,
  Refs,
  WatchList,
} from '../src/types';

export default function createInstance(
  element: HTMLElement,
  template: HTMLTemplateElement,
  compiledScript: CompiledScript,
  parent?: ComponentInstance,
): ComponentInstance {
  const componentController: ComponentController = compiledScript({
    $refs: {},
    $parent: parent,
    $emit: this.eventHandler.emit.bind(this),
    $take: () => {},
    $handleEventFromChild: () => {},
  });
  const refs: Refs = {};
  const data: Data = {};
  const props: Props = componentController.props ?? {};
  const methods: Methods = componentController.methods ?? {};
  const events: Events = componentController.events ?? [];
  const watchList: WatchList = componentController.watchList ?? [];
  const templateProcessor = createTemplateProcessor();
  const lifecycle = createLifecycleManager();
  const ready: { promise: Promise<void>; resolve: () => void } = (() => {
    let resolve: () => void;
    const promise = new Promise<void>((res) => (resolve = res));
    return { promise, resolve: resolve! };
  })();

  let isMounted = false;
  let isRendering = false;
  let renderRequestId: number | null = null;
  let lastRenderedData = '';

  function take(pluginName: string) {
    return ExtensionRegistry.plugins[pluginName]?.setup?.(data);
  }

  function processProps() {
    const hasDefinedProps = Object.keys(props).length > 0;

    Array.from(element.attributes).forEach((attr) => {
      const isDynamic = attr.name.startsWith(':');
      const propName = kebabToCamel(attr.name.substring(isDynamic ? 1 : 0));
      const value = isDynamic ? parent?.data[propName] : attr.value !== '' ? attr.value : true;

      if (!hasDefinedProps || (props[propName] && validateProp(propName, value))) {
        (data as Record<string, any>)[propName] = value;
      }
    });

    for (const [propName, propOptions] of Object.entries(props)) {
      if (!(propName in data)) {
        if (propOptions.default !== undefined) {
          data[propName] = propOptions.default;
        } else if (propOptions.required) {
          console.error(`❌ Required prop "${propName}" is missing.`);
        }
      }
    }
  }

  function validateProp(propName: string, propValue: any): boolean {
    const propOptions = props?.[propName];
    const pValue = propValue ?? propOptions?.default;
    if (!propOptions) return true;

    const expectedType =
      typeof propOptions.type === 'string'
        ? propOptions.type.toLowerCase()
        : (propOptions.type as unknown as Function).name.toLowerCase();

    const actualType = Array.isArray(pValue) ? 'array' : typeof pValue;

    const typeMatches = {
      string: actualType === 'string',
      number: actualType === 'number',
      boolean: actualType === 'boolean',
      array: Array.isArray(pValue),
      object: actualType === 'object' && pValue !== null && !Array.isArray(pValue),
      function: actualType === 'function',
    }[expectedType];

    if (!typeMatches) {
      console.error(
        `❌ Prop "${propName}" should be of type "${expectedType}", but got "${actualType}".`,
        pValue,
      );
      return false;
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

  async function init(): Promise<void> {
    await parent?.readyPromise;

    const module = await componentController({
      $refs: refs,
      $parent: parent,
      $emit: eventHandler.emit,
      $take: take,
      $handleEventFromChild: eventHandler.handleEventFromChild,
    });

    const model = new Model(module.data ?? {}, () => scheduleRender());
    data = model.data;
    bindMethods(data, methods);

    setupWatchList(model);
    processProps();
    lifecycle.setupLifecycleHooks(module);
    await lifecycle.callHook('created');
    await render();

    if (!isMounted) {
      await lifecycle.callHook('mounted');
      isMounted = true;
    }

    ready.resolve();
  }

  function setupWatchList(model: Model<Data>) {
    const propsKeys = Object.keys(props);
    const watchSet = new Set(watchList);

    propsKeys.forEach((propName) => {
      model.watch(propName);
      watchSet.delete(propName);
    });

    watchSet.forEach((path) => model.watch(path));
  }

  function scheduleRender() {
    if (isRendering && renderRequestId) cancelAnimationFrame(renderRequestId);
    renderRequestId = requestAnimationFrame(() => render());
  }

  async function render(): Promise<void> {
    if (isRendering) return;

    const currentData = JSON.stringify(data);
    if (lastRenderedData === currentData) return;

    isRendering = true;
    lastRenderedData = currentData;

    const container = template.content.cloneNode(true) as DocumentFragment;
    processSlots(container);

    await templateProcessor.processTemplate(container, data, refs);
    await lifecycle.callHook('processed');

    eventHandler.bindNativeEvents(container);
    eventHandler.setupEvents(events, container, refs);

    await lifecycle.callHook(isMounted ? 'beforeUpdate' : 'beforeMount');

    element.replaceChildren(container);

    if (isMounted) await lifecycle.callHook('updated');

    isRendering = false;
  }

  function processSlots(container: DocumentFragment) {
    const slotContent = Array.from(element.childNodes).filter(
      (node) => node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE,
    );

    const slotMap: { [key: string]: Node[] } = {};

    slotContent.forEach((node) => {
      const slotName =
        node instanceof HTMLElement && node.hasAttribute('slot')
          ? node.getAttribute('slot')!
          : 'default';
      slotMap[slotName] = slotMap[slotName] || [];
      slotMap[slotName].push(node);
    });

    container.querySelectorAll('slot').forEach((slotElement) => {
      const slotName = slotElement.getAttribute('name') || 'default';
      const replacementNodes = slotMap[slotName];

      if (replacementNodes && replacementNodes.length > 0) {
        replacementNodes.forEach((node) => {
          slotElement.parentNode!.insertBefore(node, slotElement);
        });
      }

      slotElement.remove();
    });
  }

  const eventHandler = createEventHandler(parent, data);

  return {
    element,
    template,
    data,
    props,
    methods,
    events,
    watchList,
    $refs: refs,
    $parent: parent,
    $emit: eventHandler.emit,
    $take: take,
    readyPromise: ready.promise,
    $handleEventFromChild: eventHandler.handleEventFromChild,
    lifecycle: lifecycle,
    init,
  } satisfies ComponentInstance;
}
