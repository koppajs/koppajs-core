import { bindNativeEvents, setupEvents } from "./event-handler";
import { createModel } from "./model";
import { processTemplate } from "./template-processor";
import {
  bindMethods,
  compileCode,
  createHookRegistry,
  ExtensionRegistry,
  evaluateExpression,
  getExpectedPropTypeName,
  getValueByPath,
  hasComponentInstance,
  hookEmit,
  hookOn,
  isSimplePathExpression,
  kebabToCamel,
  setValueByPath,
  extractWatchListFromTemplate,
  bindOnce,
} from "./utils";

import { Core } from ".";
import {
  lifecycleHooks,
  type ComponentInstance,
  type ComponentSource,
  type Data,
  type Events,
  type HTMLElementWithInstance,
  type Props,
  type Refs,
} from "./types";
import { composeBySource } from "./compose";

function getParentInstance(el: Element): ComponentInstance | undefined {
  const rootNode = el.getRootNode();
  const parent =
    el.parentElement ??
    (rootNode instanceof ShadowRoot ? rootNode.host : undefined);

  if (hasComponentInstance(parent)) {
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
    (node) =>
      node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE
  );

  const slotMap: Record<string, Node[]> = {};

  for (const node of slotContent) {
    const slotName =
      node instanceof HTMLElement && node.hasAttribute("slot")
        ? node.getAttribute("slot")!
        : "default";

    if (!slotMap[slotName]) {
      slotMap[slotName] = [];
    }

    slotMap[slotName].push(node);
  }

  container.querySelectorAll("slot").forEach((slotElement) => {
    const slotName = slotElement.getAttribute("name") || "default";
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
  const actualType = Array.isArray(pValue) ? "array" : typeof pValue;

  const typeChecks: Record<string, boolean> = {
    string: actualType === "string",
    number: actualType === "number",
    boolean: actualType === "boolean",
    array: Array.isArray(pValue),
    object:
      actualType === "object" && pValue !== null && !Array.isArray(pValue),
    function: actualType === "function",
  };

  // If expected type is unknown, skip runtime type validation
  const typeMatches =
    expectedType === "unknown" ? true : (typeChecks[expectedType] ?? false);

  if (!typeMatches) {
    console.error(
      `❌ Prop "${propName}" should be of type "${expectedType}", but got "${actualType}".`,
      pValue
    );
    return false;
  }

  if (
    propOptions.regex &&
    typeof pValue === "string" &&
    !new RegExp(propOptions.regex).test(pValue)
  ) {
    console.error(
      `❌ Prop "${propName}" does not match regex "${propOptions.regex}".`
    );
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

  const defineBoundProp = (propName: string, parentPath: string) => {
    Object.defineProperty(data, propName, {
      enumerable: true,
      configurable: true,
      get() {
        if (!parent) return undefined;
        return getValueByPath(parent.data, parentPath);
      },
      set(next) {
        if (!parent) return;

        try {
          setValueByPath(parent.data, parentPath, next);
        } catch (error) {
          console.error(
            `❌ Failed to set bound prop "${propName}" → "${parentPath}"`,
            error
          );
        }
      },
    });
  };

  Array.from(ele.attributes).forEach((attr) => {
    const isDynamic = attr.name.startsWith(":");
    const propName = kebabToCamel(attr.name.substring(isDynamic ? 1 : 0));

    // ignore ":" without parent (SSR, standalone, etc.)
    if (isDynamic && !parent) return;

    // If component declares props, validate against it (as far as possible)
    const isAllowed =
      !hasDefinedProps || (props[propName] && props[propName] !== undefined);

    if (!isAllowed) return;

    // STATIC
    if (!isDynamic) {
      const value = attr.value !== "" ? attr.value : true;

      if (
        !hasDefinedProps ||
        validateProp({ propName, propValue: value, props })
      ) {
        data[propName] = value;
      }

      return;
    }

    // DYNAMIC
    const expr = attr.value?.trim() ?? "";

    // If it's a simple path, create a true binding (two-way)
    if (expr && isSimplePathExpression(expr)) {
      // validate based on current value (read)
      const currentValue = getValueByPath(parent!.data, expr);

      if (
        !hasDefinedProps ||
        validateProp({ propName, propValue: currentValue, props })
      ) {
        defineBoundProp(propName, expr);
      }

      return;
    }

    // Otherwise: evaluate expression one-way (read-only)
    const evaluated = expr ? evaluateExpression(expr, parent!.data) : undefined;

    if (
      !hasDefinedProps ||
      validateProp({ propName, propValue: evaluated, props })
    ) {
      data[propName] = evaluated;
    }
  });

  // Defaults / required
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

export function registerComponent(
  componentName: string,
  source: ComponentSource
): void {
  customElements.define(
    componentName,
    class extends HTMLElement {
      private template: HTMLTemplateElement;

      /**
       * Nicht private: wir wollen kompatibel bleiben und über HTMLElementWithInstance arbeiten.
       */
      public instance?: ComponentInstance;

      constructor() {
        super();
        this.template = document.createElement("template");
        this.template.innerHTML = source.template;
      }

      async connectedCallback() {
        const host = this as HTMLElementWithInstance;

        // Parent früh ermitteln (bevor replaceChildren Children aktiviert)
        const parent = getParentInstance(host);

        const clonedTemplate = this.template.cloneNode(
          true
        ) as HTMLTemplateElement;

        const compiledScript = compileCode(source.script);

        const refs: Refs = {};
        let isMounted = false;
        let isRendering = false;
        let lastRenderedData = "";

        const lifecycleRegistry = createHookRegistry();

        // Ready promise setup
        const ready: { promise: Promise<void>; resolve: () => void } = (() => {
          let resolve!: () => void;
          const promise = new Promise<void>((res) => {
            resolve = res;
          });
          return { promise, resolve };
        })();

        // Style injection
        if (!document.head.querySelector(`style#style-${componentName}`)) {
          const style = document.createElement("style");
          style.id = `style-${componentName}`;
          style.textContent = source.style;
          document.head.appendChild(style);
        }

        /**
         * TDZ-fix für data: Variable existiert sofort, wird später gesetzt.
         */
        let data!: Data;
        let bindings!: Data;

        const take = (pluginName: string) => {
          const plugin = ExtensionRegistry.plugins[pluginName];

          if (!plugin || typeof plugin.setup !== "function") {
            console.warn(
              `Plugin "${pluginName}" not found or has no setup method`
            );
            return undefined;
          }

          try {
            return plugin.setup.call(data);
          } catch (error) {
            console.error(`Plugin "${pluginName}" setup failed:`, error);
            return undefined;
          }
        };

        // Modules attach
        const attachedModules: Record<string, any> = {};
        for (const [moduleName, module] of Object.entries(
          ExtensionRegistry.modules
        )) {
          if (typeof module.attach === "function") {
            const attached = module.attach.call({
              element: host,
              parent,
              core: { take: Core.take },
            });

            if (attached) {
              attachedModules[`$${moduleName}`] = attached;
            }
          }
        }

        // $emit Funktion
        const $emit = (eventName: string, ...args: any[]) => {
          let current = parent;

          while (current) {
            const handlerName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
            const handler = current.methods?.[handlerName];
            const cb = current.bindings;
            if (typeof handler === "function" && cb) {
              bindOnce(handler, cb)(...args);
            }

            current = current.$parent;
          }
        };

        // Script ausführen
        const controller = compiledScript({
          $refs: refs,
          $parent: parent,
          $emit,
          $take: take,
          ...attachedModules,
        });

        // Model setup
        const model = createModel(controller.data ?? {});
        data = model.data;

        // Controller Bits
        const methods = controller.methods || {};
        const props = controller.props || {};
        const events = (controller.events || []) satisfies Events;

        let watchList = controller.watchList || [];

        processProps({
          ele: host,
          parent,
          props,
          data,
        });

        bindings = composeBySource([methods, data]);

        bindMethods(methods, bindings);

        // Hooks registrieren
        for (const hook of lifecycleHooks) {
          const fn = controller[hook];
          if (typeof fn === "function") {
            hookOn(
              lifecycleRegistry,
              hook,
              async () => await fn.bind(bindings)()
            );
          }
        }

        const autoWatch = extractWatchListFromTemplate(
          this.template.innerHTML
        ).filter((p) => {
          const root = p.split(".")[0]!;
          return Object.prototype.hasOwnProperty.call(data, root);
        });

        // Watch setup
        watchList = Array.from(
          new Set([...watchList, ...autoWatch, ...Object.keys(props)])
        );
        watchList.forEach((path) => model.watch(path));

        /**
         * render zuerst definieren (sonst TDZ wenn Observer feuert)
         */
        const render = async () => {
          if (isRendering) return;

          const currentData = JSON.stringify(data);
          if (lastRenderedData === currentData) return;

          isRendering = true;

          try {
            const container = clonedTemplate.content.cloneNode(
              true
            ) as DocumentFragment;

            processSlots({ container, host });

            await processTemplate(container, data, refs);
            await hookEmit("global", "processed", data);
            await hookEmit(lifecycleRegistry, "processed");

            bindNativeEvents(methods, container, bindings);
            setupEvents(bindings, events, container, refs);

            await hookEmit(
              "global",
              isMounted ? "beforeUpdate" : "beforeMount",
              data
            );
            await hookEmit(
              lifecycleRegistry,
              isMounted ? "beforeUpdate" : "beforeMount"
            );

            host.replaceChildren(container);

            await hookEmit("global", "updated", data);
            if (isMounted) {
              await hookEmit(lifecycleRegistry, "updated");
            }

            lastRenderedData = currentData;
          } catch (error) {
            console.error("❌ Error during render:", error);
          } finally {
            isRendering = false;
          }
        };

        /**
         * Parent/Child Fix: instance VOR initial render setzen
         */
        host.instance = {
          element: host,
          template: clonedTemplate,
          data,
          bindings,
          props,
          methods,
          events,
          watchList,
          $refs: refs,
          $parent: parent,
          $emit,
          $take: take,
          readyPromise: ready.promise,
          lifecycleRegistry,
          ...attachedModules,
        } satisfies ComponentInstance;

        // Observer hinzufügen (jetzt render bereits definiert)
        model.addObserver(() => {
          requestAnimationFrame(() => {
            void render().catch((error) => {
              console.error("❌ Error during render:", error);
            });
          });
        });

        // created
        await hookEmit("global", "created", data);
        await hookEmit(lifecycleRegistry, "created");

        // initial render
        await render();

        // mounted
        if (!isMounted) {
          await hookEmit("global", "mounted", data);
          await hookEmit(lifecycleRegistry, "mounted");
          isMounted = true;
        }

        ready.resolve();
      }

      async disconnectedCallback() {
        const host = this as HTMLElementWithInstance;
        if (!host.instance) return;

        const instance = host.instance;

        await hookEmit("global", "beforeDestroy", instance.data);
        await hookEmit(instance.lifecycleRegistry, "beforeDestroy");

        if (!document.body.querySelector(this.tagName.toLowerCase())) {
          document.head
            .querySelector(`style#style-${this.tagName.toLowerCase()}`)
            ?.remove();
        }

        await hookEmit("global", "destroyed", instance.data);
        await hookEmit(instance.lifecycleRegistry, "destroyed");
      }
    }
  );
}
