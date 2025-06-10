// 📁 `src/types/NewComponent.ts`

import ExtensionRegistry from './ExtensionRegistry';
import {
  ComponentController,
  ComponentInstance,
  Context,
  Data,
  Refs,
  Methods,
  Events,
  Props,
  WatchList,
} from './types';
import { compileCode, generateCompactUniqueId, bindMethods, kebabToCamel } from './utils';
import { LifecycleManager } from './LifecycleManager';
import { TemplateProcessor } from './TemplateProcessor';
import { EventHandler } from './EventHandler';
import { Model } from './Model';

const INSTANCE = Symbol('instance');

const getParentInstance = (el: Element): ComponentInstance | undefined => {
  const rootNode = el.getRootNode();
  const parent = el.parentElement ?? (rootNode instanceof ShadowRoot ? rootNode.host : undefined);
  return parent instanceof HTMLElement ? (parent as any)[INSTANCE] : undefined;
};

const processProps = (
  element: HTMLElement,
  data: Data,
  props: Props = {},
  parent?: ComponentInstance,
): void => {
  const hasDefinedProps = Object.keys(props).length > 0;
  Array.from(element.attributes).forEach((attr) => {
    const isDynamic = attr.name.startsWith(':');
    const name = kebabToCamel(attr.name.slice(isDynamic ? 1 : 0));
    const value = isDynamic ? parent?.data?.[name] : attr.value !== '' ? attr.value : true;
    if (!hasDefinedProps || (props[name] && validateProp(name, value, props))) {
      data[name] = value;
    }
  });
  for (const [name, options] of Object.entries(props)) {
    if (!(name in data)) {
      if (options.default !== undefined) {
        data[name] = options.default;
      } else if (options.required) {
        console.error(`❌ Required prop "${name}" is missing.`);
      }
    }
  }
};

const validateProp = (name: string, value: any, props: Props): boolean => {
  const def = props[name];
  if (!def) return true;
  const expected =
    typeof def.type === 'string'
      ? def.type.toLowerCase()
      : (def.type as Function)?.name.toLowerCase();
  const actual = Array.isArray(value) ? 'array' : typeof value;
  if (expected && actual !== expected) {
    console.error(`❌ Prop "${name}" expected type "${expected}" but got "${actual}".`);
    return false;
  }
  if (def.regex && typeof value === 'string' && !new RegExp(def.regex).test(value)) {
    console.error(`❌ Prop "${name}" does not match regex "${def.regex}".`);
    return false;
  }
  return true;
};

const setupWatchList = (model: Model<Data>, watchList: WatchList = [], props: Props = {}): void => {
  const set = new Set(watchList);
  for (const key of Object.keys(props)) {
    model.watch(key);
    set.delete(key);
  }
  for (const path of set) model.watch(path);
};

const init = async (
  element: HTMLElement,
  template: HTMLTemplateElement,
  compiled: (context: Context, modules: any) => ComponentController,
  parentInstance?: ComponentInstance,
): Promise<ComponentInstance> => {
  const refs: Refs = {};
  let readyResolve!: () => void;
  const readyPromise = new Promise<void>((resolve) => (readyResolve = resolve));

  const context: Context = {
    $refs: refs,
    $parent: parentInstance,
    $emit: (...args) => {
      element.dispatchEvent(
        new CustomEvent(args[0], {
          detail: args[1],
          bubbles: true,
          composed: true,
        }),
      );
    },
    $take: (pluginName: string) => ExtensionRegistry.plugins[pluginName]?.setup?.(refs),
  };

  const controller = compiled(context, ExtensionRegistry.modules);
  const model = new Model(controller.data, () => requestAnimationFrame(() => render(instance)));
  bindMethods(model.data, controller.methods);

  const lifecycleManager = new LifecycleManager();
  const templateProcessor = new TemplateProcessor();
  const eventHandler = new EventHandler(parentInstance, model.data);

  const instance: ComponentInstance = {
    element,
    template,
    parent: parentInstance,
    data: model.data,
    methods: controller.methods,
    props: controller.props,
    events: controller.events,
    watchList: controller.watchList,
    refs,
    emit: context.$emit,
    take: context.$take,
    readyPromise,
    lifecycleManager,
    templateProcessor,
    eventHandler,
    setupWatchList: (m) => setupWatchList(m, controller.watchList, controller.props),
    processProps: () => processProps(element, model.data, controller.props, parentInstance),
  };

  instance.processProps();
  instance.setupWatchList(model);
  await lifecycleManager.setupLifecycleHooks(controller).callHook('created');

  return instance;
};

const render = async (instance: ComponentInstance) => {
  const {
    element,
    template,
    data,
    refs,
    methods,
    events,
    templateProcessor,
    eventHandler,
    lifecycleManager,
  } = instance;
  const container = template.content.cloneNode(true) as DocumentFragment;

  const slotContent = Array.from(element.childNodes).filter(
    (n) => n.nodeType === 1 || n.nodeType === 3,
  );
  const slotMap: { [k: string]: Node[] } = {};
  slotContent.forEach((node) => {
    const name =
      node instanceof HTMLElement && node.hasAttribute('slot')
        ? node.getAttribute('slot')!
        : 'default';
    (slotMap[name] ??= []).push(node);
  });
  container.querySelectorAll('slot').forEach((slot) => {
    const name = slot.getAttribute('name') ?? 'default';
    slotMap[name]?.forEach((n) => slot.parentNode!.insertBefore(n, slot));
    slot.remove();
  });

  container.querySelectorAll<HTMLElement>('[id]').forEach((el) => (refs[el.id] = el));

  await templateProcessor.processTemplate(container, data, refs);
  await lifecycleManager.callHook('processed');

  eventHandler.bindNativeEvents(container);
  eventHandler.setupEvents(events ?? [], container, refs);

  await lifecycleManager.callHook('beforeMount');
  element.replaceChildren(container);
  await lifecycleManager.callHook('mounted');
};

const register = (componentName: string, source: ComponentSource) => {
  const compiledScript = compileCode(source.script);

  customElements.define(
    componentName,
    class extends HTMLElement {
      [INSTANCE]: ComponentInstance;
      private instanceId!: string;
      private template: HTMLTemplateElement;

      constructor() {
        super();
        this.template = document.createElement('template');
        this.template.innerHTML = source.template;
      }

      async connectedCallback() {
        this.instanceId = generateCompactUniqueId();

        if (!document.head.querySelector(`style#${componentName}`)) {
          const style = document.createElement('style');
          style.id = componentName;
          style.textContent = source.style;
          document.head.appendChild(style);
        }

        const instance = await init(
          this,
          this.template.cloneNode(true) as HTMLTemplateElement,
          compiledScript,
          getParentInstance(this),
        );
        this[INSTANCE] = ExtensionRegistry.instances[this.instanceId] = instance;
        await render(instance);
      }

      async disconnectedCallback() {
        const instance = ExtensionRegistry.instances[this.instanceId];
        await instance?.lifecycleManager.callHook('beforeDestroy');
        if (!document.body.querySelector(componentName)) {
          document.head.querySelector(`style#${componentName}`)?.remove();
        }
        delete ExtensionRegistry.instances[this.instanceId];
        await instance?.lifecycleManager.callHook('destroyed');
      }
    },
  );
};

export { register, INSTANCE };
export default { register, INSTANCE };
