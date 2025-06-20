// src/component.ts

import {
  bindNativeEvents,
  cleanupAllEventsFor,
  cleanupElementAndChildren,
  emit,
  handleEventFromChild,
  setupEvents,
} from './event-handler';
import { createModel } from './model';
import { processTemplate } from './template-processor';
import {
  bindMethods,
  compileCode,
  createHookRegistry,
  ExtensionRegistry,
  getExpectedPropTypeName,
  hookEmit,
  hookOn,
  isHTMLElementWithInstance,
  kebabToCamel,
} from './utils';

import {
  lifecycleHooks,
  type ComponentInstance,
  type ComponentSource,
  type Data,
  type Events,
  type Props,
  type Refs,
} from './types';
import { Core } from '.';

function getParentInstance(el: Element): ComponentInstance | undefined {
  const rootNode = el.getRootNode();
  const parent = el.parentElement ?? (rootNode instanceof ShadowRoot ? rootNode.host : undefined);

  if (isHTMLElementWithInstance(parent)) {
    return parent.instance;
  }

  return undefined;
}

export function processSlots({
  container,
  host,
}: {
  container: DocumentFragment;
  host: HTMLElement;
}): void {
  const slotContent = Array.from(host.childNodes).filter(
    (node) => node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE,
  );

  const slotMap: Record<string, Node[]> = {};

  for (const node of slotContent) {
    const slotName =
      node instanceof HTMLElement && node.hasAttribute('slot')
        ? node.getAttribute('slot')!
        : 'default';

    if (!slotMap[slotName]) {
      slotMap[slotName] = [];
    }

    slotMap[slotName].push(node);
  }

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

export function validateProp({
  propName,
  propValue,
  props,
}: {
  propName: string;
  propValue: any;
  props: Props;
}): boolean {
  const propOptions = props[propName];
  const pValue = propValue ?? propOptions?.default;

  if (!propOptions) return true;

  const expectedType = getExpectedPropTypeName(propOptions.type);

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

function processProps({
  ele,
  parent,
  props,
  data,
}: {
  ele: HTMLElement;
  parent: ComponentInstance | undefined;
  props: Props;
  data: Data;
}) {
  const hasDefinedProps = Object.keys(props).length > 0;
  Array.from(ele.attributes).forEach((attr) => {
    const isDynamic = attr.name.startsWith(':');
    const propName = kebabToCamel(attr.name.substring(isDynamic ? 1 : 0));
    const value = isDynamic ? parent?.data[propName] : attr.value !== '' ? attr.value : true;

    if (
      !hasDefinedProps ||
      (props[propName] && validateProp({ propName, propValue: value, props }))
    ) {
      data[propName] = value;
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

export function registerComponent(componentName: string, source: ComponentSource): void {
  customElements.define(
    componentName,
    class extends HTMLElement {
      private template: HTMLTemplateElement;

      constructor() {
        super();
        this.template = document.createElement('template');
        this.template.innerHTML = source.template;
      }

      async connectedCallback() {
        const parent = getParentInstance(this);
        const clonedTemplate = this.template.cloneNode(true) as HTMLTemplateElement;
        const compiledScript = compileCode(source.script);

        const refs: Refs = {};
        let isMounted = false;
        let isRendering = false;
        let lastRenderedData = '';

        const lifecycleRegistry = createHookRegistry();

        // Ready promise setup
        const ready: { promise: Promise<void>; resolve: () => void } = (() => {
          let resolve: () => void;
          const promise = new Promise<void>((res) => (resolve = res));
          return { promise, resolve: resolve! };
        })();

        // Style injection
        if (!document.head.querySelector(`style#style-${componentName}`)) {
          const style = document.createElement('style');
          style.id = `style-${componentName}`;
          style.textContent = source.style;
          document.head.appendChild(style);
        }

        // WICHTIG: take function mit this-binding
        const take = (pluginName: string) => {
          const plugin = ExtensionRegistry.plugins[pluginName];

          if (!plugin || typeof plugin.setup !== 'function') {
            console.warn(`Plugin "${pluginName}" not found or has no setup method`);
            return undefined;
          }

          // setup() mit data als this-Context aufrufen
          try {
            // WICHTIG: call mit data als this
            return plugin.setup.call(data);
          } catch (error) {
            console.error(`Plugin "${pluginName}" setup failed:`, error);
            return undefined;
          }
        };

        // WICHTIG: Sammle alle Module und führe attach() aus
        const attachedModules: Record<string, any> = {};

        for (const [moduleName, module] of Object.entries(ExtensionRegistry.modules)) {
          if (typeof module.attach === 'function') {
            // attach() mit Component Context ausführen
            const attached = module.attach.call({
              element: this,
              parent,
              core: { take: Core.take },
            });

            // Füge das Modul mit $ prefix hinzu
            if (attached) {
              attachedModules[`$${moduleName}`] = attached;
            }
          }
        }

        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            mutation.removedNodes.forEach((node) => {
              if (node instanceof HTMLElement) cleanupElementAndChildren(node);
            });
          }
        });

        observer.observe(this, { subtree: true, childList: true });
        this._eventObserver = observer; // für späteren disconnect

        const render = async () => {
          if (isRendering) return;
          const currentData = JSON.stringify(data);
          if (lastRenderedData === currentData) return;
          isRendering = true;
          lastRenderedData = currentData;

          const container = clonedTemplate.content.cloneNode(true) as DocumentFragment;
          processSlots({ container, host: this });

          await processTemplate(container, data, refs);
          await hookEmit('global', 'processed', data);
          await hookEmit(lifecycleRegistry, 'processed');

          bindNativeEvents(data, container, this);
          setupEvents(data, events, container, refs, this);

          await hookEmit('global', isMounted ? 'beforeUpdate' : 'beforeMount', data);
          await hookEmit(lifecycleRegistry, isMounted ? 'beforeUpdate' : 'beforeMount');
          this.replaceChildren(container);

          await hookEmit('global', 'updated', data);
          if (isMounted) await hookEmit(lifecycleRegistry, 'updated');
          isRendering = false;
        };

        // Erweitere den Context für compiledScript
        const controller = compiledScript({
          $refs: refs,
          $parent: parent,
          $emit: emit,
          $take: take,
          $handleEventFromChild: handleEventFromChild,
          ...attachedModules, // Alle Module hinzufügen
        });

        // Model setup
        const model = createModel(controller.data ?? {}, async () => await render());
        const { data } = model;

        // Observer hinzufügen
        model.addObserver(() => {
          requestAnimationFrame(() => render());
        });

        // Setze die Daten und Methoden
        const methods = controller.methods || {};
        const props = controller.props || {};
        const events = (controller.events || []) satisfies Events;
        let watchList = controller.watchList || [];

        processProps({
          ele: this,
          parent,
          props,
          data,
        });

        bindMethods(data, methods);

        // Lifecycle-Hooks aus dem Controller in die Registry eintragen
        for (const hook of lifecycleHooks) {
          const fn = controller[hook];
          if (typeof fn === 'function') {
            hookOn(lifecycleRegistry, hook, fn.bind(data));
          }
        }

        // Watch setup
        watchList = Array.from(new Set([...watchList, ...Object.keys(props)]));
        watchList.forEach((path) => model.watch(path));

        await hookEmit('global', 'created', data);
        await hookEmit(lifecycleRegistry, 'created');

        await render();

        if (!isMounted) {
          await hookEmit('global', 'mounted', data);
          await hookEmit(lifecycleRegistry, 'mounted');
          isMounted = true;
        }

        this.instance = {
          element: this,
          template: clonedTemplate,
          data,
          props,
          methods,
          events,
          watchList: controller.watchList ?? [],
          $refs: refs,
          $parent: parent,
          $emit: emit,
          $take: take,
          $handleEventFromChild: handleEventFromChild,
          readyPromise: ready.promise,
          lifecycleRegistry,
        } satisfies ComponentInstance;

        ready.resolve();
      }

      async disconnectedCallback() {
        const instance = this.instance!;
        await hookEmit('global', 'beforeDestroy', instance.data);
        await hookEmit(instance.lifecycleRegistry, 'beforeDestroy');

        this._eventObserver?.disconnect();
        cleanupAllEventsFor(this);

        if (!document.body.querySelector(this.tagName.toLowerCase())) {
          document.head.querySelector(`style#style-${this.tagName.toLowerCase()}`)?.remove();
        }

        await hookEmit('global', 'destroyed', instance.data);
        await hookEmit(instance.lifecycleRegistry, 'destroyed');
      }
    },
  );
}
