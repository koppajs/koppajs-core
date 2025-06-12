// src/component.ts

import { processTemplate } from './template-processor';
import {
  ComponentContext,
  ComponentController,
  ComponentInstance,
  ComponentSource,
  Data,
  Events,
  Methods,
  Props,
  Refs,
} from './types';
import { compileCode, kebabToCamel } from './utils';
import ExtensionRegistry from './utils/extension-registry';

function getParentInstance(el: Element): ComponentInstance | undefined {
  const rootNode = el.getRootNode();
  const parent = el.parentElement ?? (rootNode instanceof ShadowRoot ? rootNode.host : undefined);
  return (parent as any)?.instance;
}

export function registerComponent(componentName: string, source: ComponentSource): void {
  customElements.define(
    componentName,
    class extends HTMLElement {
      public instance!: ComponentInstance;
      private template: HTMLTemplateElement;
      private compiledScript: (ctx: ComponentContext) => ComponentController;
      private parent?: ComponentInstance;

      constructor() {
        super();
        this.template = document.createElement('template');
        this.template.innerHTML = source.template;
        this.compiledScript = compileCode(source.script);
      }

      async connectedCallback() {
        this.parent = getParentInstance(this);
        const clonedTemplate = this.template.cloneNode(true) as HTMLTemplateElement;

        if (!document.head.querySelector(`style#style-${componentName}`)) {
          const style = document.createElement('style');
          style.id = `style-${componentName}`;
          style.textContent = source.style;
          document.head.appendChild(style);
        }

        const refs: Refs = {};
        const data: Data = {};
        let methods: Methods = {};
        let props: Props = {};
        let events: Events = [];
        const lifecycle = createLifecycle();
        let isMounted = false;
        let isRendering = false;
        let renderRequestId: number | null = null;
        let lastRenderedData = '';

        const ready: { promise: Promise<void>; resolve: () => void } = (() => {
          let resolve: () => void;
          const promise = new Promise<void>((res) => (resolve = res));
          return { promise, resolve: resolve! };
        })();

        const take = (pluginName: string) => ExtensionRegistry.plugins[pluginName]?.setup?.(data);
        const eventHandler = createEventHandler(this.parent, data);

        const processProps = () => {
          const hasDefinedProps = Object.keys(props).length > 0;
          Array.from(this.attributes).forEach((attr) => {
            const isDynamic = attr.name.startsWith(':');
            const propName = kebabToCamel(attr.name.substring(isDynamic ? 1 : 0));
            const value = isDynamic
              ? this.parent?.data[propName]
              : attr.value !== ''
                ? attr.value
                : true;

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
        };

        const validateProp = (propName: string, propValue: any): boolean => {
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
        };

        const render = async () => {
          if (isRendering) return;
          const currentData = JSON.stringify(data);
          if (lastRenderedData === currentData) return;
          isRendering = true;
          lastRenderedData = currentData;

          const container = clonedTemplate.content.cloneNode(true) as DocumentFragment;
          processSlots(container);

          await processTemplate(container, data, refs);
          await lifecycle.callHook('processed');

          eventHandler.bindNativeEvents(container);
          eventHandler.setupEvents(events, container, refs);

          await lifecycle.callHook(isMounted ? 'beforeUpdate' : 'beforeMount');
          this.replaceChildren(container);

          if (isMounted) await lifecycle.callHook('updated');
          isRendering = false;
        };

        const processSlots = (container: DocumentFragment) => {
          const slotContent = Array.from(this.childNodes).filter(
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
        };

        const controller = this.compiledScript({
          $refs: refs,
          $parent: this.parent,
          $emit: eventHandler.emit,
          $take: take,
          $handleEventFromChild: eventHandler.handleEventFromChild,
        });

        const model = new Model(controller.data ?? {}, () => render());
        Object.assign(data, model.data);
        methods = controller.methods ?? {};
        props = controller.props ?? {};
        events = controller.events ?? [];

        bindMethods(data, methods);
        processProps();

        controller.watchList?.forEach((path) => model.watch(path));
        Object.keys(props).forEach((key) => model.watch(key));

        lifecycle.setupLifecycleHooks(controller);
        await lifecycle.callHook('created');
        await render();

        if (!isMounted) {
          await lifecycle.callHook('mounted');
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
          $parent: this.parent,
          $emit: eventHandler.emit,
          $take: take,
          readyPromise: ready.promise,
          $handleEventFromChild: eventHandler.handleEventFromChild,
          lifecycle,
        } satisfies ComponentInstance;

        ready.resolve();
      }

      async disconnectedCallback() {
        await this.instance?.lifecycle.emit('beforeDestroy');
        if (!document.body.querySelector(componentName)) {
          document.head.querySelector(`style#style-${componentName}`)?.remove();
        }
        await this.instance?.lifecycle.emit('destroyed');
      }
    },
  );
}
